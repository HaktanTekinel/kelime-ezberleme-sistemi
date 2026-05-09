import base64
import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
STORY_IMAGE_DIR = UPLOAD_DIR / "stories"
STORY_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini")
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-4.1-mini")


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY .env içinde tanımlı değil.",
        )

    return OpenAI(api_key=api_key)


def clean_words(words: list[str]) -> list[str]:
    return [word.strip() for word in words if word and word.strip()]


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


def generate_story_with_llm(client: OpenAI, words: list[str]) -> tuple[str, str]:
    prompt = f"""
Aşağıdaki İngilizce kelimeleri sırasıyla kullanarak kısa, anlaşılır ve yaratıcı bir Türkçe hikaye oluştur.

Kelimeler:
{", ".join(words)}

Kurallar:
- Hikaye Türkçe olsun.
- Verilen İngilizce kelimeler hikayenin içinde aynen geçsin.
- Hikaye çok uzun olmasın.
- Ayrıca 1 cümlelik kısa Türkçe özet üret.
- Sadece geçerli JSON döndür.

JSON formatı:
{{
  "story": "...",
  "summary": "..."
}}
"""

    response = client.responses.create(
        model=TEXT_MODEL,
        input=prompt,
    )

    raw_text = response.output_text.strip()

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        return raw_text, "LLM tarafından oluşturulan Word Chain hikayesi."

    story = data.get("story", "").strip()
    summary = data.get("summary", "").strip()

    if not story:
        story = raw_text

    if not summary:
        summary = "LLM tarafından oluşturulan Word Chain hikayesi."

    return story, summary


def generate_story_image(client: OpenAI, story_id: int, words: list[str], summary: str) -> str:
    image_prompt = f"""
Create a colorful educational illustration for a vocabulary learning app.

Words: {", ".join(words)}
Story summary: {summary}

Style:
- friendly digital illustration
- suitable for students
- no text in the image
- clear objects representing the story
"""

    response = client.responses.create(
        model=IMAGE_MODEL,
        input=image_prompt,
        tools=[{"type": "image_generation"}],
    )

    image_base64_list = [
        output.result
        for output in response.output
        if output.type == "image_generation_call"
    ]

    if not image_base64_list:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LLM görsel üretimi başarısız oldu.",
        )

    file_name = f"story_{story_id}.png"
    file_path = STORY_IMAGE_DIR / file_name

    image_bytes = base64.b64decode(image_base64_list[0])
    file_path.write_bytes(image_bytes)

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

    client = get_openai_client()

    story_text, summary_text = generate_story_with_llm(client, words)

    new_story = models.WordChainStory(
        user_id=current_user.id,
        prompt_words_json=words,
        story_text=story_text,
        summary_text=summary_text,
        image_url=None,
        llm_model_name=TEXT_MODEL,
    )

    db.add(new_story)
    db.flush()

    image_url = generate_story_image(
        client=client,
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