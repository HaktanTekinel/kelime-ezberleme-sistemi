from __future__ import annotations

from sqlalchemy.orm import Session

import models
import schemas


def get_answer_rows(db: Session, user_id: int) -> list[tuple[models.QuizAnswer, models.Word]]:
    return (
        db.query(models.QuizAnswer, models.Word)
        .join(models.Word, models.Word.id == models.QuizAnswer.word_id)
        .filter(models.QuizAnswer.user_id == user_id)
        .all()
    )


def get_learned_word_rows(db: Session, user_id: int) -> list[models.Word]:
    return (
        db.query(models.Word)
        .join(models.UserWordProgress, models.UserWordProgress.word_id == models.Word.id)
        .filter(
            models.UserWordProgress.user_id == user_id,
            models.UserWordProgress.is_learned == True,
        )
        .all()
    )


def get_success_rate(correct_count: int, total_count: int) -> float:
    if total_count == 0:
        return 0.0

    return round((correct_count / total_count) * 100, 2)


def create_category_bucket() -> dict:
    return {
        "correct_word_ids": set(),
        "wrong_word_ids": set(),
        "correct_words": [],
        "wrong_words": [],
    }


CEFR_LEVELS = ("A1", "A2", "B1", "B2", "C1", "C2")


def get_cefr_level_label(word: models.Word) -> str:
    topic = (word.topic or "").strip().upper()

    if topic in CEFR_LEVELS:
        return topic

    level = word.difficulty_level or 1
    index = min(max(level, 1), len(CEFR_LEVELS)) - 1
    return CEFR_LEVELS[index]


def get_category_names(word: models.Word) -> list[str]:
    return [
        word.topic or "Genel",
        get_cefr_level_label(word),
    ]


def build_word_item(word: models.Word) -> schemas.CategoryWordItem:
    return schemas.CategoryWordItem(
        word_id=word.id,
        eng_word=word.eng_word,
        tur_word=word.tur_word,
    )


def add_word_to_bucket(bucket: dict, status: str, word: models.Word) -> None:
    word_ids_key = f"{status}_word_ids"
    words_key = f"{status}_words"

    if word.id in bucket[word_ids_key]:
        return

    bucket[word_ids_key].add(word.id)
    bucket[words_key].append(build_word_item(word))


def add_word_to_categories(stats: dict[str, dict], word: models.Word, status: str) -> None:
    for category_name in get_category_names(word):
        stats.setdefault(category_name, create_category_bucket())
        add_word_to_bucket(stats[category_name], status, word)


def build_category_report(name: str, bucket: dict) -> schemas.CategoryReport:
    correct_count = len(bucket["correct_word_ids"])
    wrong_count = len(bucket["wrong_word_ids"])
    total_count = correct_count + wrong_count

    return schemas.CategoryReport(
        name=name,
        correct=correct_count,
        wrong=wrong_count,
        total=total_count,
        success_rate=get_success_rate(correct_count, total_count),
        correct_words=bucket["correct_words"],
        wrong_words=bucket["wrong_words"],
    )


def sort_category_reports(reports: list[schemas.CategoryReport]) -> list[schemas.CategoryReport]:
    def sort_key(report: schemas.CategoryReport) -> tuple[int, int | str]:
        if report.name in CEFR_LEVELS:
            return (0, CEFR_LEVELS.index(report.name))

        return (1, report.name)

    return sorted(reports, key=sort_key)


def build_category_reports(
    answers: list[tuple[models.QuizAnswer, models.Word]],
    learned_words: list[models.Word],
) -> list[schemas.CategoryReport]:
    stats: dict[str, dict] = {}

    for word in learned_words:
        add_word_to_categories(stats, word, "correct")

    for answer, word in answers:
        if answer.is_correct:
            add_word_to_categories(stats, word, "correct")
        else:
            add_word_to_categories(stats, word, "wrong")

    reports = [
        build_category_report(name=category_name, bucket=bucket)
        for category_name, bucket in stats.items()
    ]

    return sort_category_reports(reports)


def count_learned_words(db: Session, user_id: int) -> int:
    return (
        db.query(models.UserWordProgress)
        .filter(
            models.UserWordProgress.user_id == user_id,
            models.UserWordProgress.is_learned == True,
        )
        .count()
    )


def count_pending_reviews(db: Session, user_id: int) -> int:
    return (
        db.query(models.UserWordProgress)
        .filter(
            models.UserWordProgress.user_id == user_id,
            models.UserWordProgress.is_learned == False,
            models.UserWordProgress.next_review_at.isnot(None),
        )
        .count()
    )


def build_report_data(db: Session, user_id: int) -> dict:
    answers = get_answer_rows(db, user_id)
    learned_words = get_learned_word_rows(db, user_id)

    correct_answers = sum(1 for answer, _word in answers if answer.is_correct)
    wrong_answers = sum(1 for answer, _word in answers if not answer.is_correct)
    total_answers = correct_answers + wrong_answers
    learned_word_count = count_learned_words(db, user_id)

    return {
        "total_answers": total_answers,
        "correct_answers": correct_answers,
        "wrong_answers": wrong_answers,
        "success_rate": get_success_rate(correct_answers, total_answers),
        "learned_words": learned_word_count,
        "mastered_words": learned_word_count,
        "pending_reviews": count_pending_reviews(db, user_id),
        "category_reports": build_category_reports(answers, learned_words),
    }