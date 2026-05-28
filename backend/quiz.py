from __future__ import annotations

import calendar
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func

import models
import schemas
from auth import CurrentUser, DbSession

router = APIRouter()

DEFAULT_DAILY_QUESTION_COUNT = 10

QUIZ_RESPONSES = {
    status.HTTP_400_BAD_REQUEST: {
        "description": "Quiz için yeterli kelime yok veya istek geçersiz."
    },
    status.HTTP_404_NOT_FOUND: {
        "description": "Kelime bulunamadı."
    },
}


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def add_months(source_date: datetime, months: int) -> datetime:
    month_index = source_date.month - 1 + months
    year = source_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(source_date.day, calendar.monthrange(year, month)[1])

    return source_date.replace(year=year, month=month, day=day)


def get_next_review_at(
    current_stage: int,
    base_time: datetime | None = None,
) -> datetime:
    review_time = base_time or get_utc_now()

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
        return review_time + step

    return add_months(review_time, int(step[:-1]))


def get_daily_question_count(db: DbSession, user: models.User) -> int:
    settings = (
        db.query(models.UserSettings)
        .filter(models.UserSettings.user_id == user.id)
        .first()
    )

    if settings:
        return settings.daily_new_word_count or DEFAULT_DAILY_QUESTION_COUNT

    return user.daily_quiz_limit or DEFAULT_DAILY_QUESTION_COUNT


def build_quiz_options(db: DbSession, current_word: models.Word) -> list[str]:
    wrong_answers = (
        db.query(models.Word.tur_word)
        .filter(models.Word.id != current_word.id)
        .filter(models.Word.is_active.is_(True))
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sınav için yeterli kelime yok. En az 4 aktif kelime ekleyin.",
        )

    options = random.sample(unique_wrong_answers, 3) + [current_word.tur_word]
    random.shuffle(options)

    return options


def build_question(
    db: DbSession,
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
    db: DbSession,
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


def get_due_items(
    db: DbSession,
    user_id: int,
    now: datetime,
    question_limit: int,
):
    return (
        db.query(models.UserWordProgress, models.Word)
        .join(models.Word, models.Word.id == models.UserWordProgress.word_id)
        .filter(models.UserWordProgress.user_id == user_id)
        .filter(models.UserWordProgress.is_learned.is_(False))
        .filter(models.UserWordProgress.next_review_at.isnot(None))
        .filter(models.UserWordProgress.next_review_at <= now)
        .filter(models.Word.is_active.is_(True))
        .order_by(
            models.UserWordProgress.next_review_at.asc(),
            models.UserWordProgress.id.asc(),
        )
        .limit(question_limit)
        .all()
    )


def get_progressed_word_ids(db: DbSession, user_id: int) -> list[int]:
    return [
        row[0]
        for row in (
            db.query(models.UserWordProgress.word_id)
            .filter(models.UserWordProgress.user_id == user_id)
            .all()
        )
    ]


def get_new_words(
    db: DbSession,
    excluded_ids: set[int],
    limit: int,
) -> list[models.Word]:
    query = db.query(models.Word).filter(models.Word.is_active.is_(True))

    if excluded_ids:
        query = query.filter(~models.Word.id.in_(excluded_ids))

    return query.order_by(func.random()).limit(limit).all()


def add_due_questions(
    db: DbSession,
    due_items,
    questions: list[schemas.QuizQuestionRead],
    selected_word_ids: set[int],
) -> None:
    for progress, word in due_items:
        questions.append(build_question(db, word, progress.current_stage))
        selected_word_ids.add(word.id)


def add_new_questions(
    db: DbSession,
    user_id: int,
    questions: list[schemas.QuizQuestionRead],
    selected_word_ids: set[int],
    remaining_slots: int,
) -> None:
    if remaining_slots <= 0:
        return

    progressed_word_ids = get_progressed_word_ids(db, user_id)
    excluded_ids = set(progressed_word_ids) | selected_word_ids
    new_words = get_new_words(db, excluded_ids, remaining_slots)

    for word in new_words:
        questions.append(build_question(db, word, 0))
        selected_word_ids.add(word.id)


@router.get(
    "/daily",
    response_model=schemas.QuizDailyResponse,
    responses=QUIZ_RESPONSES,
)
def get_daily_quiz(
    current_user: CurrentUser,
    db: DbSession,
):
    now = get_utc_now()
    question_limit = get_daily_question_count(db, current_user)
    due_items = get_due_items(db, current_user.id, now, question_limit)

    questions: list[schemas.QuizQuestionRead] = []
    selected_word_ids: set[int] = set()

    add_due_questions(db, due_items, questions, selected_word_ids)
    add_new_questions(
        db=db,
        user_id=current_user.id,
        questions=questions,
        selected_word_ids=selected_word_ids,
        remaining_slots=question_limit - len(questions),
    )

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


@router.post("/demo/advance-reviews")
def advance_demo_reviews(
    current_user: CurrentUser,
    db: DbSession,
):
    now = get_utc_now()

    progress_items = (
        db.query(models.UserWordProgress)
        .filter(models.UserWordProgress.user_id == current_user.id)
        .filter(models.UserWordProgress.is_learned.is_(False))
        .filter(models.UserWordProgress.next_review_at.isnot(None))
        .filter(models.UserWordProgress.next_review_at > now)
        .all()
    )

    for progress in progress_items:
        progress.next_review_at = now

    db.commit()

    return {
        "advanced_count": len(progress_items),
        "message": f"{len(progress_items)} kelimenin tekrar zamanı bugüne çekildi.",
    }


def get_active_word(db: DbSession, word_id: int) -> models.Word:
    word = (
        db.query(models.Word)
        .filter(models.Word.id == word_id, models.Word.is_active.is_(True))
        .first()
    )

    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kelime bulunamadı",
        )

    return word


def get_or_create_progress(
    db: DbSession,
    user_id: int,
    word_id: int,
) -> models.UserWordProgress:
    progress = (
        db.query(models.UserWordProgress)
        .filter(models.UserWordProgress.user_id == user_id)
        .filter(models.UserWordProgress.word_id == word_id)
        .first()
    )

    if progress:
        return progress

    progress = models.UserWordProgress(user_id=user_id, word_id=word_id)

    db.add(progress)
    db.flush()

    return progress


def apply_correct_answer(
    user: models.User,
    progress: models.UserWordProgress,
    now: datetime,
) -> str:
    progress.consecutive_correct = min(progress.consecutive_correct + 1, 6)
    progress.current_stage = min(progress.current_stage + 1, 6)
    progress.last_answer_correct = True
    progress.is_learned = progress.current_stage >= 6
    progress.next_review_at = (
        None if progress.is_learned else get_next_review_at(progress.current_stage, now)
    )

    user.total_correct_answers = (user.total_correct_answers or 0) + 1

    return "Doğru cevap."


def apply_wrong_answer(
    user: models.User,
    progress: models.UserWordProgress,
    now: datetime,
) -> str:
    progress.current_stage = 0
    progress.consecutive_correct = 0
    progress.last_answer_correct = False
    progress.is_learned = False
    progress.reset_count = (progress.reset_count or 0) + 1
    progress.next_review_at = get_next_review_at(0, now)

    user.total_wrong_answers = (user.total_wrong_answers or 0) + 1

    return "Yanlış cevap. Tekrar süreci başa alındı."


def get_quiz_session(
    db: DbSession,
    user_id: int,
    quiz_session_id: int | None,
) -> models.QuizSession:
    if not quiz_session_id:
        return get_or_create_active_session(db, user_id)

    quiz_session = (
        db.query(models.QuizSession)
        .filter(
            models.QuizSession.id == quiz_session_id,
            models.QuizSession.user_id == user_id,
        )
        .first()
    )

    return quiz_session or get_or_create_active_session(db, user_id)


def update_session_counts(
    quiz_session: models.QuizSession,
    is_correct: bool,
    now: datetime,
) -> None:
    if is_correct:
        quiz_session.correct_count = (quiz_session.correct_count or 0) + 1
    else:
        quiz_session.wrong_count = (quiz_session.wrong_count or 0) + 1

    answered_count = (
        (quiz_session.correct_count or 0)
        + (quiz_session.wrong_count or 0)
        + (quiz_session.skipped_count or 0)
    )

    if quiz_session.total_questions and answered_count >= quiz_session.total_questions:
        quiz_session.finished_at = now


@router.post(
    "/answer",
    response_model=schemas.QuizAnswerResponse,
    responses=QUIZ_RESPONSES,
)
def submit_quiz_answer(
    payload: schemas.QuizAnswerRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    now = get_utc_now()
    word = get_active_word(db, payload.word_id)
    progress = get_or_create_progress(db, current_user.id, payload.word_id)

    correct_answer = word.tur_word.strip()
    selected_answer = payload.selected_answer.strip()
    is_correct = selected_answer.lower() == correct_answer.lower()

    if is_correct:
        message = apply_correct_answer(current_user, progress, now)
    else:
        message = apply_wrong_answer(current_user, progress, now)

    quiz_session = get_quiz_session(db, current_user.id, payload.quiz_session_id)
    update_session_counts(quiz_session, is_correct, now)

    db.add(
        models.QuizAnswer(
            quiz_session_id=quiz_session.id,
            user_id=current_user.id,
            word_id=word.id,
            selected_answer=selected_answer,
            correct_answer=correct_answer,
            is_correct=is_correct,
            question_type="multiple_choice",
            response_time_ms=payload.response_time_ms,
        )
    )

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