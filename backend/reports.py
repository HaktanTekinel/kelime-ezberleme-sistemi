from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter()


@router.get("/me", response_model=schemas.ReportResponse)
def get_my_report(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    answers = (
        db.query(models.QuizAnswer, models.Word)
        .join(models.Word, models.Word.id == models.QuizAnswer.word_id)
        .filter(models.QuizAnswer.user_id == current_user.id)
        .all()
    )

    correct_answers = sum(1 for answer, _word in answers if answer.is_correct)
    wrong_answers = sum(1 for answer, _word in answers if not answer.is_correct)
    total_answers = correct_answers + wrong_answers
    success_rate = round((correct_answers / total_answers) * 100, 2) if total_answers else 0.0

    learned_words = (
        db.query(models.UserWordProgress)
        .filter(
            models.UserWordProgress.user_id == current_user.id,
            models.UserWordProgress.is_learned == True,
        )
        .count()
    )

    pending_reviews = (
        db.query(models.UserWordProgress)
        .filter(
            models.UserWordProgress.user_id == current_user.id,
            models.UserWordProgress.is_learned == False,
            models.UserWordProgress.next_review_at.isnot(None),
        )
        .count()
    )

    topic_stats: dict[str, dict[str, int]] = {}
    for answer, word in answers:
        topic = word.topic or "Genel"
        topic_stats.setdefault(topic, {"correct": 0, "wrong": 0})
        if answer.is_correct:
            topic_stats[topic]["correct"] += 1
        else:
            topic_stats[topic]["wrong"] += 1

    category_reports = []
    for topic, counts in topic_stats.items():
        total = counts["correct"] + counts["wrong"]
        category_reports.append(
            schemas.CategoryReport(
                name=topic,
                correct=counts["correct"],
                wrong=counts["wrong"],
                total=total,
                success_rate=round((counts["correct"] / total) * 100, 2) if total else 0.0,
            )
        )

    category_reports.sort(key=lambda item: item.name)

    return schemas.ReportResponse(
        total_answers=total_answers,
        correct_answers=correct_answers,
        wrong_answers=wrong_answers,
        success_rate=success_rate,
        learned_words=learned_words,
        mastered_words=learned_words,
        pending_reviews=pending_reviews,
        category_reports=category_reports,
    )