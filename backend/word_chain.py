import base64
import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from openai import OpenAI

import models
import schemas
from auth import CurrentUser, DbSession

router = APIRouter()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
STORY_IMAGE_DIR = UPLOAD_DIR / "stories"
STORY_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4.1-mini")
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1")

WORD_CHAIN_RESPONSES = {
    status.HTTP_400_BAD_REQUEST: {
        "description": "Word Chain için kelime sayısı geçersiz."
    },
    status.HTTP_500_INTERNAL_SERVER_ERROR: {
        "description": "LLM ayarı eksik veya görsel üretimi başarısız."
    },
}


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


def build_story_prompt(words: list[str]) -> str:
    word_list = ", ".join(words)

    return f"""
Aşağıdaki İngilizce kelimeleri sırasıyla kullanarak kısa, anlaşılır ve yaratıcı bir Türkçe hikaye oluştur.

Kelimeler:
{word_list}

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


def parse_story_response(raw_text: str) -> tuple[str, str]:
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        return raw_text, "LLM tarafından oluşturulan Word Chain hikayesi."

    story = data.get("story", "").strip() or raw_text
    summary = data.get("summary", "").strip()

    if not summary:
        summary = "LLM tarafından oluşturulan Word Chain hikayesi."

    return story, summary


def generate_story_with_llm(client: OpenAI, words: list[str]) -> tuple[str, str]:
    response = client.responses.create(
        model=TEXT_MODEL,
        input=build_story_prompt(words),
    )

    return parse_story_response(response.output_text.strip())


def build_image_prompt(words: list[str], summary: str) -> str:
    return f"""
Create a colorful educational illustration for a vocabulary learning app.

Words: {", ".join(words)}
Story summary: {summary}

Style:
- friendly digital illustration
- suitable for students
- no text in the image
- clear objects representing the story
"""


def get_image_base64(response) -> str:
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

    return image_base64_list[0]


def generate_story_image(
    client: OpenAI,
    story_id: int,
    words: list[str],
    summary: str,
) -> str:
    response = client.responses.create(
        model=IMAGE_MODEL,
        input=build_image_prompt(words, summary),
        tools=[{"type": "image_generation"}],
    )

    file_name = f"story_{story_id}.png"
    file_path = STORY_IMAGE_DIR / file_name
    image_bytes = base64.b64decode(get_image_base64(response))

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


@router.post(
    "/generate",
    response_model=schemas.WordChainGenerateResponse,
    responses=WORD_CHAIN_RESPONSES,
)
def generate_word_chain_story(
    payload: schemas.WordChainGenerateRequest,
    current_user: CurrentUser,
    db: DbSession,
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

    new_story.image_url = generate_story_image(
        client=client,
        story_id=new_story.id,
        words=words,
        summary=summary_text,
    )

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
    current_user: CurrentUser,
    db: DbSession,
):
    stories = (
        db.query(models.WordChainStory)
        .filter(models.WordChainStory.user_id == current_user.id)
        .order_by(
            models.WordChainStory.created_at.desc(),
            models.WordChainStory.id.desc(),
        )
        .all()
    )

    return schemas.WordChainHistoryResponse(
        history=[build_history_item(story) for story in stories]
    )
