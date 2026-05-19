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


def get_target_word(db: Session, game: models.WordleGame) -> models.Word:
    word = (
        db.query(models.Word)
        .filter(models.Word.id == game.target_word_id)
        .filter(models.Word.is_active == True)
        .first()
    )

    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oyuna ait hedef kelime bulunamadı.",
        )

    return word


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
    word_length: int | None,
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


def evaluate_guess(guess: str, target: str) -> list[dict]:
    guess = normalize_word(guess)
    target = normalize_word(target)

    result = ["absent"] * len(guess)
    remaining_letters: dict[str, int] = {}

    for index, target_letter in enumerate(target):
        if guess[index] == target_letter:
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
        {
            "letter": letter,
            "status": result[index],
        }
        for index, letter in enumerate(guess)
    ]


def get_game_guesses(db: Session, game_id: int) -> list[schemas.WordleGuessItem]:
    guesses = (
        db.query(models.WordleGuess)
        .filter(models.WordleGuess.game_id == game_id)
        .order_by(models.WordleGuess.id.asc())
        .all()
    )

    return [
        schemas.WordleGuessItem(
            guess=item.guess,
            feedback=[
                schemas.WordleLetterResult(
                    letter=letter_result["letter"],
                    status=letter_result["status"],
                )
                for letter_result in item.feedback_json
            ],
        )
        for item in guesses
    ]


def build_game_response(
    db: Session,
    game: models.WordleGame,
    target_word: models.Word,
    message: str | None = None,
) -> schemas.WordleGameEnvelopeResponse:
    return schemas.WordleGameEnvelopeResponse(
        game=schemas.WordleGameData(
            id=game.id,
            status=game.status,
            word_length=len(normalize_word(target_word.eng_word)),
            max_attempts=MAX_ATTEMPTS,
            attempts_used=game.attempt_count,
            guesses=get_game_guesses(db, game.id),
        ),
        message=message,
    )


@router.post("/start", response_model=schemas.WordleGameEnvelopeResponse)
def start_wordle_game(
    payload: schemas.WordleStartRequest | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = payload or schemas.WordleStartRequest()

    active_game = get_active_game(db, current_user.id)

    if active_game and not payload.restart:
        target_word = get_target_word(db, active_game)
        return build_game_response(
            db=db,
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
        db=db,
        game=new_game,
        target_word=target_word,
        message="Wordle oyunu başlatıldı.",
    )


@router.get("/current", response_model=schemas.WordleGameEnvelopeResponse)
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

    target_word = get_target_word(db, active_game)

    return build_game_response(
        db=db,
        game=active_game,
        target_word=target_word,
        message="Aktif Wordle oyunu getirildi.",
    )


@router.post("/guess", response_model=schemas.WordleGameEnvelopeResponse)
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

    if payload.game_id and payload.game_id != active_game.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gönderilen oyun aktif oyun ile eşleşmiyor.",
        )

    target_word = get_target_word(db, active_game)

    guess = normalize_word(payload.guess)
    target = normalize_word(target_word.eng_word)

    if len(guess) != len(target):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tahmin {len(target)} harfli olmalı.",
        )

    feedback = evaluate_guess(guess, target)

    active_game.attempt_count += 1

    is_correct = guess == target

    if is_correct:
        active_game.status = "won"
        active_game.finished_at = datetime.utcnow()
        message = "Tebrikler, kelimeyi doğru buldun."
    elif active_game.attempt_count >= MAX_ATTEMPTS:
        active_game.status = "lost"
        active_game.finished_at = datetime.utcnow()
        message = f"Tahmin hakkın bitti. Doğru kelime: {target_word.eng_word}"
    else:
        message = "Tahmin kaydedildi."

    db.add(
        models.WordleGuess(
            game_id=active_game.id,
            user_id=current_user.id,
            guess=guess,
            feedback_json=feedback,
        )
    )

    db.commit()
    db.refresh(active_game)

    return build_game_response(
        db=db,
        game=active_game,
        target_word=target_word,
        message=message,
    )