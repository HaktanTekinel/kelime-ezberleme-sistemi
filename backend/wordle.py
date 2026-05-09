import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter()

MAX_ATTEMPTS = 6


def normalize_word(word: str) -> str:
    return word.strip().lower()


def get_active_game(db: Session, user_id: int) -> models.WordleGame | None:
    return (
        db.query(models.WordleGame)
        .filter(
            models.WordleGame.user_id == user_id,
            models.WordleGame.status == "active",
        )
        .order_by(models.WordleGame.started_at.desc(), models.WordleGame.id.desc())
        .first()
    )


def get_learned_words(
    db: Session,
    user_id: int,
    word_length: int | None = None,
) -> list[models.Word]:
    query = (
        db.query(models.Word)
        .join(models.UserWordProgress, models.UserWordProgress.word_id == models.Word.id)
        .filter(models.UserWordProgress.user_id == user_id)
        .filter(models.UserWordProgress.is_learned == True)
        .filter(models.Word.is_active == True)
    )

    if word_length:
        query = query.filter(func.length(models.Word.eng_word) == word_length)

    return query.all()


def pick_target_word(
    db: Session,
    user_id: int,
    word_length: int | None = 5,
) -> models.Word:
    learned_words = get_learned_words(db, user_id, word_length)

    if not learned_words and word_length:
        learned_words = get_learned_words(db, user_id, None)

    if not learned_words:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wordle başlatmak için önce en az 1 kelime öğrenilmiş olmalı.",
        )

    return random.choice(learned_words)


def build_game_response(
    game: models.WordleGame,
    target_word: models.Word,
    message: str,
) -> schemas.WordleGameResponse:
    return schemas.WordleGameResponse(
        id=game.id,
        status=game.status,
        attempt_count=game.attempt_count,
        max_attempts=MAX_ATTEMPTS,
        word_length=len(normalize_word(target_word.eng_word)),
        message=message,
        finished_at=game.finished_at,
    )


def evaluate_guess(guess: str, target: str) -> list[schemas.WordleLetterResult]:
    guess = normalize_word(guess)
    target = normalize_word(target)

    result = ["absent"] * len(guess)
    remaining_letters: dict[str, int] = {}

    for index, target_letter in enumerate(target):
        if index < len(guess) and guess[index] == target_letter:
            result[index] = "correct"
        else:
            remaining_letters[target_letter] = remaining_letters.get(target_letter, 0) + 1

    for index, guess_letter in enumerate(guess):
        if result[index] == "correct":
            continue

        if remaining_letters.get(guess_letter, 0) > 0:
            result[index] = "present"
            remaining_letters[guess_letter] -= 1

    return [
        schemas.WordleLetterResult(letter=letter, status=result[index])
        for index, letter in enumerate(guess)
    ]


@router.post("/start", response_model=schemas.WordleGameResponse)
def start_wordle_game(
    payload: schemas.WordleStartRequest | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = payload or schemas.WordleStartRequest()

    active_game = get_active_game(db, current_user.id)

    if active_game and not payload.restart:
        target_word = (
            db.query(models.Word)
            .filter(models.Word.id == active_game.target_word_id)
            .first()
        )

        if not target_word:
            active_game.status = "cancelled"
            active_game.finished_at = datetime.utcnow()
            db.commit()
        else:
            return build_game_response(
                game=active_game,
                target_word=target_word,
                message="Devam eden Wordle oyunun var.",
            )

    if active_game and payload.restart:
        active_game.status = "cancelled"
        active_game.finished_at = datetime.utcnow()
        db.flush()

    target_word = pick_target_word(
        db=db,
        user_id=current_user.id,
        word_length=payload.word_length,
    )

    new_game = models.WordleGame(
        user_id=current_user.id,
        target_word_id=target_word.id,
        status="active",
        attempt_count=0,
    )

    db.add(new_game)
    db.commit()
    db.refresh(new_game)

    return build_game_response(
        game=new_game,
        target_word=target_word,
        message="Wordle oyunu başlatıldı.",
    )


@router.get("/current", response_model=schemas.WordleGameResponse)
def get_current_wordle_game(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active_game = get_active_game(db, current_user.id)

    if not active_game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aktif Wordle oyunu bulunamadı.",
        )

    target_word = (
        db.query(models.Word)
        .filter(models.Word.id == active_game.target_word_id)
        .first()
    )

    if not target_word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oyuna ait hedef kelime bulunamadı.",
        )

    return build_game_response(
        game=active_game,
        target_word=target_word,
        message="Aktif Wordle oyunu getirildi.",
    )


@router.post("/guess", response_model=schemas.WordleGuessResponse)
def guess_wordle(
    payload: schemas.WordleGuessRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active_game = get_active_game(db, current_user.id)

    if not active_game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aktif Wordle oyunu yok. Önce oyun başlatın.",
        )

    target_word = (
        db.query(models.Word)
        .filter(models.Word.id == active_game.target_word_id)
        .first()
    )

    if not target_word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oyuna ait hedef kelime bulunamadı.",
        )

    guess = normalize_word(payload.guess)
    target = normalize_word(target_word.eng_word)

    if len(guess) != len(target):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tahmin {len(target)} harfli olmalı.",
        )

    active_game.attempt_count += 1

    is_correct = guess == target
    result = evaluate_guess(guess, target)

    if is_correct:
        active_game.status = "won"
        active_game.finished_at = datetime.utcnow()
        message = "Tebrikler, kelimeyi doğru bildiniz."
    elif active_game.attempt_count >= MAX_ATTEMPTS:
        active_game.status = "lost"
        active_game.finished_at = datetime.utcnow()
        message = "Tahmin hakkınız bitti."
    else:
        message = "Tahmin kaydedildi."

    db.commit()
    db.refresh(active_game)

    should_show_target = active_game.status in ["won", "lost"]

    return schemas.WordleGuessResponse(
        game_id=active_game.id,
        guess=guess,
        result=result,
        attempt_count=active_game.attempt_count,
        max_attempts=MAX_ATTEMPTS,
        is_correct=is_correct,
        status=active_game.status,
        target_word=target_word.eng_word if should_show_target else None,
        message=message,
    )