from __future__ import annotations
import calendar
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import models, schemas
from database import get_db
from auth import get_current_user_id  # JWT Güvenlik kalkanımızı import ettik

router = APIRouter()

QUIZ_LIMIT = 10

def add_months(source_date: datetime, months: int) -> datetime:
    month_index = source_date.month - 1 + months
    year = source_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(source_date.day, calendar.monthrange(year, month)[1])
    return source_date.replace(year=year, month=month, day=day)

def get_next_review_at(current_stage: int, base_time: datetime | None = None) -> datetime:
    base_time = base_time or datetime.utcnow()
    # Tekrar aralıkları: 1 gün, 1 hafta, 1 ay, 3 ay, 6 ay, 12 ay
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

    # Sistemde kelime sayısı çok azsa, uygulama çökmesin diye hata döndür
    if len(unique_wrong_answers) < 3:
        raise HTTPException(status_code=400, detail="Sınav için yeterli sayıda kelime yok. Lütfen sisteme en az 4 kelime ekleyin.")

    selected_wrong_answers = random.sample(unique_wrong_answers, 3)
    options = selected_wrong_answers + [current_word.tur_word]
    random.shuffle(options) # Şıkları karıştır
    return options

@router.get("/daily", response_model=schemas.QuizDailyResponse)
def get_daily_quiz(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # user_id artık URL'den değil, doğrudan Token'dan güvenli bir şekilde geliyor
    now = datetime.utcnow()
    today = now.date()

    # 1. VADESİ GELMİŞ (Tekrar edilmesi gereken) KELİMELERİ BUL
    due_progress_items = (
        db.query(models.UserWordProgress, models.Word)
        .join(models.Word, models.Word.id == models.UserWordProgress.word_id)
        .filter(models.UserWordProgress.user_id == user_id)
        .filter(models.UserWordProgress.is_learned == False)
        .filter(models.UserWordProgress.next_review_at.isnot(None))
        .order_by(models.UserWordProgress.next_review_at.asc(), models.UserWordProgress.id.asc())
        .all()
    )
    
    due_progress_items = [
        (progress, word)
        for progress, word in due_progress_items
        if progress.next_review_at and progress.next_review_at.date() <= today
    ]

    questions = []
    for progress, word in due_progress_items[:QUIZ_LIMIT]:
        questions.append(
            schemas.QuizQuestionRead(
                word_id=word.id,
                eng_word=word.eng_word,
                picture_url=word.picture_url,
                options=build_quiz_options(db, word),
            )
        )

    # 2. EĞER LİMİT DOLMADIYSA (10 Soru), YENİ EKLENMİŞ RASTGELE KELİMELERLE TAMAMLA
    remaining_slots = QUIZ_LIMIT - len(questions)
    if remaining_slots > 0:
        existing_word_ids = [row[0] for row in db.query(models.UserWordProgress.word_id).filter(models.UserWordProgress.user_id == user_id).all()]
        new_word_query = db.query(models.Word).filter(models.Word.is_active == True)
        if existing_word_ids:
            new_word_query = new_word_query.filter(~models.Word.id.in_(existing_word_ids))

        new_words = new_word_query.order_by(func.random()).limit(remaining_slots).all()
        for word in new_words:
            questions.append(
                schemas.QuizQuestionRead(
                    word_id=word.id,
                    eng_word=word.eng_word,
                    picture_url=word.picture_url,
                    options=build_quiz_options(db, word),
                )
            )

    return schemas.QuizDailyResponse(
        user_id=user_id,
        total_questions=len(questions),
        due_count=min(len(due_progress_items), QUIZ_LIMIT),
        new_count=max(0, len(questions) - min(len(due_progress_items), QUIZ_LIMIT)),
        questions=questions,
    )

@router.post("/answer", response_model=schemas.QuizAnswerResponse)
def submit_quiz_answer(payload: schemas.QuizAnswerRequest, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # user_id artık payload (body) içinden değil, doğrudan Token'dan güvenli bir şekilde geliyor
    now = datetime.utcnow()
    word = db.query(models.Word).filter(models.Word.id == payload.word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    progress = (
        db.query(models.UserWordProgress)
        .filter(models.UserWordProgress.user_id == user_id)
        .filter(models.UserWordProgress.word_id == payload.word_id)
        .first()
    )
    
    if not progress:
        progress = models.UserWordProgress(user_id=user_id, word_id=payload.word_id)
        db.add(progress)
        db.flush()

    correct_answer = word.tur_word.strip()
    is_correct = payload.selected_answer.strip().lower() == correct_answer.lower()

    if is_correct:
        progress.consecutive_correct = min(progress.consecutive_correct + 1, 6)
        progress.current_stage = min(progress.current_stage + 1, 6)
        progress.last_answer_correct = True
        progress.is_learned = progress.current_stage >= 6

        if progress.is_learned:
            progress.next_review_at = None
        else:
            progress.next_review_at = get_next_review_at(progress.current_stage, now)
    else:
        progress.current_stage = 0
        progress.consecutive_correct = 0
        progress.last_answer_correct = False
        progress.is_learned = False
        progress.reset_count += 1
        progress.next_review_at = get_next_review_at(0, now)

    db.commit()
    db.refresh(progress)

    return schemas.QuizAnswerResponse(
        user_id=user_id,
        word_id=payload.word_id,
        is_correct=is_correct,
        correct_answer=correct_answer,
        current_stage=progress.current_stage,
        next_review_at=progress.next_review_at,
        is_learned=progress.is_learned,
        consecutive_correct=progress.consecutive_correct,
        reset_count=progress.reset_count,
    )