from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter()


@router.put("/me/settings", response_model=schemas.UserSettingsResponse)
def update_my_settings(
    payload: schemas.UserSettingsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.daily_quiz_limit = payload.daily_quiz_limit
    db.commit()
    db.refresh(current_user)

    return schemas.UserSettingsResponse(
        user_id=current_user.id,
        daily_quiz_limit=current_user.daily_quiz_limit,
    )


@router.get("/me/stats", response_model=schemas.UserStatsResponse)
def get_my_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    learned_words_count = db.query(models.UserWordProgress).filter(
        models.UserWordProgress.user_id == current_user.id,
        models.UserWordProgress.is_learned == True,
    ).count()

    total_correct_answers = current_user.total_correct_answers or 0
    total_wrong_answers = current_user.total_wrong_answers or 0
    total_answers = total_correct_answers + total_wrong_answers
    success_rate = round((total_correct_answers / total_answers) * 100, 2) if total_answers else 0.0

    return schemas.UserStatsResponse(
        user_id=current_user.id,
        total_learned_words=learned_words_count,
        total_correct_answers=total_correct_answers,
        total_wrong_answers=total_wrong_answers,
        success_rate=success_rate,
    )
