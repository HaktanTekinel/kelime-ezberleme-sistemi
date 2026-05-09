import html
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
STORY_IMAGE_DIR = UPLOAD_DIR / "stories"
STORY_IMAGE_DIR.mkdir(parents=True, exist_ok=True)


def clean_words(words: list[str]) -> list[str]:
    cleaned_words = []

    for word in words:
        clean_word = word.strip()

        if clean_word:
            cleaned_words.append(clean_word)

    return cleaned_words


def validate_words(words: list[str]) -> None:
    if len(words) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word Chain için en az 3 kelime gönderilmelidir.",
        )

    if len(words) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Word Chain için en fazla 10 kelime gönderilebilir.",
        )


def generate_demo_story(words: list[str]) -> str:
    first_word = words[0]
    last_word = words[-1]
    middle_words = words[1:-1]

    story_parts = [
        f"{first_word} adlı meraklı bir karakter, yeni kelimeleri öğrenmek için küçük bir yolculuğa çıktı."
    ]

    for word in middle_words:
        story_parts.append(
            f"Yolculuk sırasında karşısına çıkan '{word}' kelimesi ona hikayenin yeni bir ipucunu verdi."
        )

    story_parts.append(
        f"Sonunda '{last_word}' kelimesine ulaşarak bütün kelimeleri anlamlı bir hikaye zincirine dönüştürdü."
    )

    return " ".join(story_parts)


def generate_demo_summary(words: list[str]) -> str:
    return (
        f"{words[0]} ile başlayan hikaye, "
        f"{', '.join(words[1:-1])} kelimeleriyle gelişir ve "
        f"{words[-1]} kelimesiyle tamamlanır."
    )


def create_story_svg(story_id: int, words: list[str], summary: str) -> str:
    safe_words = [html.escape(word) for word in words]
    safe_summary = html.escape(summary)

    word_items = ""
    start_x = 60
    start_y = 145

    for index, word in enumerate(safe_words):
        y = start_y + (index * 42)
        word_items += f"""
        <text x="{start_x}" y="{y}" font-size="24" fill="#ffffff" font-family="Arial">
            {index + 1}. {word}
        </text>
        """

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
    <rect width="900" height="600" rx="32" fill="#161b3a"/>
    <rect x="30" y="30" width="840" height="540" rx="28" fill="#23295c"/>
    <text x="60" y="85" font-size="34" fill="#ffffff" font-family="Arial" font-weight="bold">
        Word Chain Story
    </text>
    <text x="60" y="115" font-size="18" fill="#aeb8ff" font-family="Arial">
        LLM demo görseli - kelime zinciri
    </text>
    {word_items}
    <text x="60" y="520" font-size="20" fill="#f1f1f1" font-family="Arial">
        {safe_summary[:95]}
    </text>
</svg>"""

    file_name = f"story_{story_id}.svg"
    file_path = STORY_IMAGE_DIR / file_name
    file_path.write_text(svg_content, encoding="utf-8")

    return f"/uploads/stories/{file_name}"


def build_history_item(story: models.WordChainStory) -> schemas.WordChainHistoryItem:
    return schemas.WordChainHistoryItem(
        id=story.id,
        words=story.prompt_words_json or [],
        story=story.story_text,
        summary=story.summary_text,
        image_url=story.image_url,
        created_at=story.created_at,
    )


@router.post("/generate", response_model=schemas.WordChainGenerateResponse)
def generate_word_chain_story(
    payload: schemas.WordChainGenerateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    words = clean_words(payload.words)
    validate_words(words)

    story_text = generate_demo_story(words)
    summary_text = generate_demo_summary(words)

    new_story = models.WordChainStory(
        user_id=current_user.id,
        prompt_words_json=words,
        story_text=story_text,
        summary_text=summary_text,
        image_url=None,
        llm_model_name="demo-word-chain-generator",
    )

    db.add(new_story)
    db.flush()

    image_url = create_story_svg(
        story_id=new_story.id,
        words=words,
        summary=summary_text,
    )

    new_story.image_url = image_url

    db.commit()
    db.refresh(new_story)

    return schemas.WordChainGenerateResponse(
        id=new_story.id,
        words=words,
        story=new_story.story_text,
        summary=new_story.summary_text,
        image_url=new_story.image_url,
        created_at=new_story.created_at,
    )


@router.get("/history", response_model=schemas.WordChainHistoryResponse)
def get_word_chain_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stories = (
        db.query(models.WordChainStory)
        .filter(models.WordChainStory.user_id == current_user.id)
        .order_by(models.WordChainStory.created_at.desc(), models.WordChainStory.id.desc())
        .all()
    )

    return schemas.WordChainHistoryResponse(
        history=[build_history_item(story) for story in stories]
    )