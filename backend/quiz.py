from __future__ import annotations

import calendar
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter()

DEFAULT_DAILY_QUESTION_COUNT = 10


def add_months(source_date: datetime, months: int) -> datetime:
    month_index = source_date.month - 1 + months
    year = source_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(source_date.day, calendar.monthrange(year, month)[1])
    return source_date.replace(year=year, month=month, day=day)


def get_next_review_at(current_stage: int, base_time: datetime | None = None) -> datetime:
    base_time = base_time or datetime.utcnow()

    schedule = {
        0: timedelta(days=1),
        1: timedelta(days=1),
        2: timedelta(days=7),
        3: "1m",
        4: "3m",
        5: "6m",
        6: "12m",
    }

    step = schedule.get(current_stage, timedelta(days=1))
    if isinstance(step, timedelta):
        return base_time + step

    return add_months(base_time, int(step[:-1]))


def get_daily_question_count(db: Session, user: models.User) -> int:
    settings = (
        db.query(models.UserSettings)
        .filter(models.UserSettings.user_id == user.id)
        .first()
    )

    if settings:
        return settings.daily_new_word_count or DEFAULT_DAILY_QUESTION_COUNT

    return user.daily_quiz_limit or DEFAULT_DAILY_QUESTION_COUNT


def build_quiz_options(db: Session, current_word: models.Word) -> list[str]:
    wrong_answers = (
        db.query(models.Word.tur_word)
        .filter(models.Word.id != current_word.id)
        .filter(models.Word.is_active == True)
        .all()
    )

    unique_wrong_answers = []
    seen = set()
    correct_answer = current_word.tur_word.strip().lower()

    for row in wrong_answers:
        answer = (row[0] or "").strip()
        if not answer:
            continue

        key = answer.lower()
        if key == correct_answer or key in seen:
            continue

        seen.add(key)
        unique_wrong_answers.append(answer)

    if len(unique_wrong_answers) < 3:
        raise HTTPException(
            status_code=400,
            detail="Sınav için yeterli kelime yok. En az 4 aktif kelime ekleyin.",
        )

    options = random.sample(unique_wrong_answers, 3) + [current_word.tur_word]
    random.shuffle(options)
    return options


def build_question(
    db: Session,
    word: models.Word,
    current_stage: int = 0,
) -> schemas.QuizQuestionRead:
    return schemas.QuizQuestionRead(
        word_id=word.id,
        eng_word=word.eng_word,
        tur_word=word.tur_word,
        picture_url=word.picture_url,
        audio_url=word.audio_url,
        options=build_quiz_options(db, word),
        current_stage=current_stage,
    )


def get_or_create_active_session(
    db: Session,
    user_id: int,
    total_questions: int = 0,
) -> models.QuizSession:
    session = (
        db.query(models.QuizSession)
        .filter(
            models.QuizSession.user_id == user_id,
            models.QuizSession.session_type == "daily",
            models.QuizSession.finished_at.is_(None),
        )
        .order_by(models.QuizSession.started_at.desc(), models.QuizSession.id.desc())
        .first()
    )

    if session:
        if total_questions and session.total_questions != total_questions:
            session.total_questions = total_questions
            db.flush()
        return session

    session = models.QuizSession(
        user_id=user_id,
        session_type="daily",
        total_questions=total_questions,
    )
    db.add(session)
    db.flush()
    return session


@router.get("/daily", response_model=schemas.QuizDailyResponse)
def get_daily_quiz(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    question_limit = get_daily_question_count(db, current_user)

    due_items = (
        db.query(models.UserWordProgress, models.Word)
        .join(models.Word, models.Word.id == models.UserWordProgress.word_id)
        .filter(models.UserWordProgress.user_id == current_user.id)
        .filter(models.UserWordProgress.is_learned == False)
        .filter(models.UserWordProgress.next_review_at.isnot(None))
        .filter(models.UserWordProgress.next_review_at <= now)
        .filter(models.Word.is_active == True)
        .order_by(models.UserWordProgress.next_review_at.asc(), models.UserWordProgress.id.asc())
        .limit(question_limit)
        .all()
    )

    questions: list[schemas.QuizQuestionRead] = []
    selected_word_ids: set[int] = set()

    for progress, word in due_items:
        questions.append(build_question(db, word, progress.current_stage))
        selected_word_ids.add(word.id)

    remaining_slots = question_limit - len(questions)

    if remaining_slots > 0:
        progressed_word_ids = [
            row[0]
            for row in (
                db.query(models.UserWordProgress.word_id)
                .filter(models.UserWordProgress.user_id == current_user.id)
                .all()
            )
        ]

        excluded_ids = set(progressed_word_ids) | selected_word_ids
        new_word_query = db.query(models.Word).filter(models.Word.is_active == True)

        if excluded_ids:
            new_word_query = new_word_query.filter(~models.Word.id.in_(excluded_ids))

        new_words = new_word_query.order_by(func.random()).limit(remaining_slots).all()

        for word in new_words:
            questions.append(build_question(db, word, 0))
            selected_word_ids.add(word.id)

    quiz_session = None
    if questions:
        quiz_session = get_or_create_active_session(db, current_user.id, len(questions))
        db.commit()
        db.refresh(quiz_session)

    due_count = len(due_items)
    new_count = max(0, len(questions) - due_count)

    return schemas.QuizDailyResponse(
        user_id=current_user.id,
        quiz_session_id=quiz_session.id if quiz_session else None,
        total_questions=len(questions),
        due_count=due_count,
        new_count=new_count,
        questions=questions,
    )


@router.post("/answer", response_model=schemas.QuizAnswerResponse)
def submit_quiz_answer(
    payload: schemas.QuizAnswerRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()

    word = (
        db.query(models.Word)
        .filter(models.Word.id == payload.word_id, models.Word.is_active == True)
        .first()
    )
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    progress = (
        db.query(models.UserWordProgress)
        .filter(models.UserWordProgress.user_id == current_user.id)
        .filter(models.UserWordProgress.word_id == payload.word_id)
        .first()
    )

    if not progress:
        progress = models.UserWordProgress(
            user_id=current_user.id,
            word_id=payload.word_id,
        )
        db.add(progress)
        db.flush()

    correct_answer = word.tur_word.strip()
    selected_answer = payload.selected_answer.strip()
    is_correct = selected_answer.lower() == correct_answer.lower()

    if is_correct:
        progress.consecutive_correct = min(progress.consecutive_correct + 1, 6)
        progress.current_stage = min(progress.current_stage + 1, 6)
        progress.last_answer_correct = True
        progress.is_learned = progress.current_stage >= 6
        progress.next_review_at = None if progress.is_learned else get_next_review_at(progress.current_stage, now)

        current_user.total_correct_answers = (current_user.total_correct_answers or 0) + 1
        message = "Doğru cevap."
    else:
        progress.current_stage = 0
        progress.consecutive_correct = 0
        progress.last_answer_correct = False
        progress.is_learned = False
        progress.reset_count = (progress.reset_count or 0) + 1
        progress.next_review_at = get_next_review_at(0, now)

        current_user.total_wrong_answers = (current_user.total_wrong_answers or 0) + 1
        message = "Yanlış cevap. Tekrar süreci başa alındı."

    quiz_session = None
    if payload.quiz_session_id:
        quiz_session = (
            db.query(models.QuizSession)
            .filter(
                models.QuizSession.id == payload.quiz_session_id,
                models.QuizSession.user_id == current_user.id,
            )
            .first()
        )

    if not quiz_session:
        quiz_session = get_or_create_active_session(db, current_user.id)

    if is_correct:
        quiz_session.correct_count = (quiz_session.correct_count or 0) + 1
    else:
        quiz_session.wrong_count = (quiz_session.wrong_count or 0) + 1

    quiz_answer = models.QuizAnswer(
        quiz_session_id=quiz_session.id,
        user_id=current_user.id,
        word_id=word.id,
        selected_answer=selected_answer,
        correct_answer=correct_answer,
        is_correct=is_correct,
        question_type="multiple_choice",
        response_time_ms=payload.response_time_ms,
    )
    db.add(quiz_answer)

    answered_count = quiz_session.correct_count + quiz_session.wrong_count + quiz_session.skipped_count
    if quiz_session.total_questions and answered_count >= quiz_session.total_questions:
        quiz_session.finished_at = now

    db.commit()
    db.refresh(progress)
    db.refresh(quiz_session)

    return schemas.QuizAnswerResponse(
        user_id=current_user.id,
        word_id=payload.word_id,
        quiz_session_id=quiz_session.id,
        is_correct=is_correct,
        correct_answer=correct_answer,
        current_stage=progress.current_stage,
        next_review_at=progress.next_review_at,
        is_learned=progress.is_learned,
        consecutive_correct=progress.consecutive_correct,
        reset_count=progress.reset_count,
        message=message,
    )