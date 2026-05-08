from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db

router = APIRouter()

TOTAL_REVIEW_STAGE = 6

REVIEW_STAGE_LABELS = {
    1: "1 gün sonra",
    2: "1 hafta sonra",
    3: "1 ay sonra",
    4: "3 ay sonra",
    5: "6 ay sonra",
    6: "1 yıl sonra",
}

REVIEW_PLAN_ITEMS = [
    {
        "stage": 1,
        "title": "1 gün sonra tekrar",
        "description": "Dünkü doğru bildiğin kelimeler",
    },
    {
        "stage": 2,
        "title": "1 hafta sonra tekrar",
        "description": "Geçen haftadan gelen kelimeler",
    },
    {
        "stage": 3,
        "title": "1 ay sonra tekrar",
        "description": "Uzun dönem hafıza kontrolü",
    },
]


def get_user_daily_goal(db: Session, user: models.User) -> int:
    settings = (
        db.query(models.UserSettings)
        .filter(models.UserSettings.user_id == user.id)
        .first()
    )

    if settings and settings.daily_new_word_count:
        return settings.daily_new_word_count

    return user.daily_quiz_limit or 10


def get_success_rate(correct_count: int, total_count: int) -> float:
    if total_count == 0:
        return 0.0

    return round((correct_count / total_count) * 100, 2)


def get_answer_counts(
    db: Session,
    user_id: int,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> tuple[int, int, int]:
    query = db.query(models.QuizAnswer).filter(models.QuizAnswer.user_id == user_id)

    if start_date:
        query = query.filter(models.QuizAnswer.answered_at >= start_date)

    if end_date:
        query = query.filter(models.QuizAnswer.answered_at < end_date)

    answers = query.all()

    correct_count = sum(1 for answer in answers if answer.is_correct)
    wrong_count = sum(1 for answer in answers if not answer.is_correct)
    total_count = correct_count + wrong_count

    return total_count, correct_count, wrong_count


def get_success_improvement(db: Session, user_id: int) -> float:
    now = datetime.utcnow()
    this_week_start = now - timedelta(days=7)
    previous_week_start = now - timedelta(days=14)

    this_total, this_correct, _ = get_answer_counts(
        db=db,
        user_id=user_id,
        start_date=this_week_start,
        end_date=now,
    )

    previous_total, previous_correct, _ = get_answer_counts(
        db=db,
        user_id=user_id,
        start_date=previous_week_start,
        end_date=this_week_start,
    )

    this_rate = get_success_rate(this_correct, this_total)
    previous_rate = get_success_rate(previous_correct, previous_total)

    if previous_total == 0:
        return 0.0

    return round(this_rate - previous_rate, 2)


def get_review_plan(db: Session, user_id: int) -> list[dict]:
    review_plan = []

    for item in REVIEW_PLAN_ITEMS:
        count = (
            db.query(models.UserWordProgress)
            .filter(models.UserWordProgress.user_id == user_id)
            .filter(models.UserWordProgress.is_learned == False)
            .filter(models.UserWordProgress.current_stage == item["stage"])
            .count()
        )

        review_plan.append(
            {
                "title": item["title"],
                "count": count,
                "description": item["description"],
            }
        )

    return review_plan


def get_next_review(db: Session, user_id: int) -> dict:
    progress = (
        db.query(models.UserWordProgress)
        .filter(models.UserWordProgress.user_id == user_id)
        .filter(models.UserWordProgress.is_learned == False)
        .filter(models.UserWordProgress.next_review_at.isnot(None))
        .order_by(models.UserWordProgress.next_review_at.asc())
        .first()
    )

    if not progress:
        return {
            "label": "Tekrar bekleyen kelime yok",
            "current_stage": 0,
            "total_stage": TOTAL_REVIEW_STAGE,
        }

    return {
        "label": REVIEW_STAGE_LABELS.get(progress.current_stage, "Tekrar zamanı"),
        "current_stage": progress.current_stage,
        "total_stage": TOTAL_REVIEW_STAGE,
    }


@router.get("/summary")
def get_dashboard_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    daily_target = get_user_daily_goal(db, current_user)

    today_total, today_correct, _ = get_answer_counts(
        db=db,
        user_id=current_user.id,
        start_date=today_start,
        end_date=now,
    )

    total_answers, total_correct, _ = get_answer_counts(
        db=db,
        user_id=current_user.id,
    )

    learned_words = (
        db.query(models.UserWordProgress)
        .filter(models.UserWordProgress.user_id == current_user.id)
        .filter(models.UserWordProgress.is_learned == True)
        .count()
    )

    pending_reviews = (
        db.query(models.UserWordProgress)
        .filter(models.UserWordProgress.user_id == current_user.id)
        .filter(models.UserWordProgress.is_learned == False)
        .filter(models.UserWordProgress.next_review_at.isnot(None))
        .filter(models.UserWordProgress.next_review_at <= now)
        .count()
    )

    weekly_new_words = (
        db.query(func.count(func.distinct(models.QuizAnswer.word_id)))
        .filter(models.QuizAnswer.user_id == current_user.id)
        .filter(models.QuizAnswer.answered_at >= week_start)
        .scalar()
        or 0
    )

    return {
        "daily_goal": {
            "target": daily_target,
            "completed": min(today_total, daily_target),
            "correct_today": today_correct,
        },
        "stats": {
            "learned_words": learned_words,
            "pending_reviews": pending_reviews,
            "success_rate": get_success_rate(total_correct, total_answers),
            "mastered_words": learned_words,
            "weekly_new_words": weekly_new_words,
            "success_improvement": get_success_improvement(db, current_user.id),
        },
        "review_plan": get_review_plan(db, current_user.id),
        "next_review": get_next_review(db, current_user.id),
    }