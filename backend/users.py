from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter()


def get_or_create_user_settings(
    db: Session,
    user: models.User,
) -> models.UserSettings:
    settings = (
        db.query(models.UserSettings)
        .filter(models.UserSettings.user_id == user.id)
        .first()
    )

    if settings:
        return settings

    settings = models.UserSettings(
        user_id=user.id,
        daily_new_word_count=user.daily_quiz_limit or 10,
        quiz_question_count=user.daily_quiz_limit or 10,
    )
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def build_settings_response(
    user: models.User,
    settings: models.UserSettings,
) -> schemas.UserSettingsResponse:
    return schemas.UserSettingsResponse(
        user_id=user.id,
        daily_new_word_count=settings.daily_new_word_count,
        daily_quiz_limit=settings.daily_new_word_count,
        quiz_question_count=settings.quiz_question_count,
        show_instant_feedback=settings.show_instant_feedback,
        allow_skip_questions=settings.allow_skip_questions,
    )


@router.get("/me/settings", response_model=schemas.UserSettingsResponse)
def get_my_settings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_or_create_user_settings(db, current_user)
    return build_settings_response(current_user, settings)


@router.put("/me/settings", response_model=schemas.UserSettingsResponse)
def update_my_settings(
    payload: schemas.UserSettingsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_or_create_user_settings(db, current_user)

    daily_count = payload.daily_new_word_count
    if daily_count is None:
        daily_count = payload.daily_quiz_limit

    if daily_count is not None:
        settings.daily_new_word_count = daily_count
        settings.quiz_question_count = daily_count
        current_user.daily_quiz_limit = daily_count

    if payload.quiz_question_count is not None:
        settings.quiz_question_count = payload.quiz_question_count

    if payload.show_instant_feedback is not None:
        settings.show_instant_feedback = payload.show_instant_feedback

    if payload.allow_skip_questions is not None:
        settings.allow_skip_questions = payload.allow_skip_questions

    db.commit()
    db.refresh(settings)
    db.refresh(current_user)

    return build_settings_response(current_user, settings)


@router.get("/me/stats", response_model=schemas.UserStatsResponse)
def get_my_stats(
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

    return schemas.UserStatsResponse(
        user_id=current_user.id,
        total_answers=total_answers,
        correct_answers=correct_answers,
        wrong_answers=wrong_answers,
        total_correct_answers=correct_answers,
        total_wrong_answers=wrong_answers,
        success_rate=success_rate,
        learned_words=learned_words,
        mastered_words=learned_words,
        pending_reviews=pending_reviews,
        category_reports=category_reports,
    )