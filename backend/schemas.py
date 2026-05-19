from datetime import datetime
from typing import Any, List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field


class ORMBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MessageResponse(BaseModel):
    status: str = "success"
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    status: str = "success"
    message: str
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(min_length=10)
    new_password: str = Field(min_length=6, max_length=128)


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    username_or_email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserRead(ORMBaseModel):
    id: int
    username: str
    email: str
    is_active: bool = True
    role: str = "user"


class TokenUser(BaseModel):
    id: int
    username: str
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: Optional[str] = None
    email: Optional[str] = None
    user: Optional[TokenUser] = None


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserSettingsUpdate(BaseModel):
    daily_new_word_count: Optional[int] = Field(default=None, ge=1, le=100)
    daily_quiz_limit: Optional[int] = Field(default=None, ge=1, le=100)
    quiz_question_count: Optional[int] = Field(default=None, ge=1, le=100)
    show_instant_feedback: Optional[bool] = None
    allow_skip_questions: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    user_id: int
    daily_new_word_count: int
    daily_quiz_limit: int
    quiz_question_count: int
    show_instant_feedback: bool
    allow_skip_questions: bool


class CategoryWordItem(BaseModel):
    word_id: int
    eng_word: str
    tur_word: Optional[str] = None


class CategoryReport(BaseModel):
    name: str
    correct: int
    wrong: int
    total: int
    success_rate: float
    correct_words: List[CategoryWordItem] = Field(default_factory=list)
    wrong_words: List[CategoryWordItem] = Field(default_factory=list)


class ReportResponse(BaseModel):
    total_answers: int
    correct_answers: int
    wrong_answers: int
    success_rate: float
    learned_words: int
    mastered_words: int
    pending_reviews: int
    category_reports: List[CategoryReport]


class UserStatsResponse(BaseModel):
    user_id: int
    total_answers: int
    correct_answers: int
    wrong_answers: int
    total_correct_answers: int
    total_wrong_answers: int
    success_rate: float
    learned_words: int
    mastered_words: int
    pending_reviews: int
    category_reports: List[CategoryReport] = Field(default_factory=list)


class WordBase(BaseModel):
    eng_word: str = Field(min_length=1, max_length=150)
    tur_word: str = Field(min_length=1, max_length=150)
    difficulty_level: int = Field(default=1, ge=1, le=10)
    topic: Optional[str] = Field(default=None, max_length=80)
    picture_url: Optional[str] = None
    audio_url: Optional[str] = None


class WordCreate(WordBase):
    samples: List[str] = Field(default_factory=list)


class WordRead(BaseModel):
    id: int
    eng_word: str
    tur_word: str
    difficulty_level: int
    topic: Optional[str] = None
    picture_url: Optional[str] = None
    audio_url: Optional[str] = None
    samples: List[str] = Field(default_factory=list)
    created_by_user_id: Optional[int] = None


class WordSampleBase(BaseModel):
    sample_text: str = Field(min_length=1)
    sample_order: int = Field(default=1, ge=1)


class WordSampleCreate(WordSampleBase):
    word_id: int


class WordSampleRead(ORMBaseModel):
    id: int
    word_id: int
    sample_text: str
    sample_order: int
    created_at: Optional[datetime] = None


class QuizQuestionRead(BaseModel):
    word_id: int
    eng_word: str
    tur_word: str
    picture_url: Optional[str] = None
    audio_url: Optional[str] = None
    options: List[str]
    current_stage: int = 0


class QuizDailyResponse(BaseModel):
    user_id: int
    quiz_session_id: Optional[int] = None
    total_questions: int
    due_count: int
    new_count: int
    questions: List[QuizQuestionRead]


class QuizAnswerRequest(BaseModel):
    word_id: int = Field(validation_alias=AliasChoices("word_id", "wordId"))
    selected_answer: str = Field(validation_alias=AliasChoices("selected_answer", "selectedAnswer"))
    quiz_session_id: Optional[int] = Field(default=None, validation_alias=AliasChoices("quiz_session_id", "quizSessionId"))
    response_time_ms: Optional[int] = Field(default=None, ge=0)


class QuizAnswerResponse(BaseModel):
    user_id: int
    word_id: int
    quiz_session_id: Optional[int] = None
    is_correct: bool
    correct_answer: str
    current_stage: int
    next_review_at: Optional[datetime] = None
    is_learned: bool
    consecutive_correct: int
    reset_count: int
    message: str


class UserWordProgressRead(ORMBaseModel):
    id: int
    user_id: int
    word_id: int
    current_stage: int
    next_review_at: Optional[datetime] = None
    is_learned: bool
    consecutive_correct: int
    last_answer_correct: Optional[bool] = None
    reset_count: int
    updated_at: Optional[datetime] = None


class QuizSessionRead(ORMBaseModel):
    id: int
    user_id: int
    session_type: str
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class QuizAnswerRead(ORMBaseModel):
    id: int
    quiz_session_id: int
    user_id: int
    word_id: int
    selected_answer: Optional[str] = None
    correct_answer: str
    is_correct: bool
    question_type: str
    response_time_ms: Optional[int] = None
    answered_at: Optional[datetime] = None


class ReportSnapshotRead(ORMBaseModel):
    id: int
    user_id: int
    report_date: Optional[datetime] = None
    total_learned_words: int
    success_rate: float
    weak_topics_json: Optional[dict[str, Any]] = None
    strong_topics_json: Optional[dict[str, Any]] = None
    created_at: Optional[datetime] = None


class WordleGameRead(ORMBaseModel):
    id: int
    user_id: int
    target_word_id: int
    status: str
    attempt_count: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

class WordChainStoryRead(ORMBaseModel):
    id: int
    user_id: int
    prompt_words_json: Optional[dict[str, Any]] = None
    story_text: Optional[str] = None
    summary_text: Optional[str] = None
    image_url: Optional[str] = None
    llm_model_name: Optional[str] = None
    created_at: Optional[datetime] = None


class WordleStartRequest(BaseModel):
    restart: bool = False
    word_length: Optional[int] = Field(default=5, ge=3, le=15)


class WordleGuessRequest(BaseModel):
    game_id: Optional[int] = Field(
        default=None,
        validation_alias=AliasChoices("game_id", "gameId"),
    )
    guess: str = Field(min_length=1, max_length=150)


class WordleLetterResult(BaseModel):
    letter: str
    status: str


class WordleGuessItem(BaseModel):
    guess: str
    feedback: List[WordleLetterResult]


class WordleGameData(BaseModel):
    id: int
    status: str
    word_length: int
    max_attempts: int
    attempts_used: int
    guesses: List[WordleGuessItem] = Field(default_factory=list)


class WordleGameEnvelopeResponse(BaseModel):
    game: WordleGameData
    message: Optional[str] = None

class WordChainGenerateRequest(BaseModel):
    words: List[str] = Field(min_length=3, max_length=10)


class WordChainGenerateResponse(BaseModel):
    id: int
    words: List[str]
    story: str
    summary: str
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None


class WordChainHistoryItem(BaseModel):
    id: int
    words: List[str]
    story: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None


class WordChainHistoryResponse(BaseModel):
    history: List[WordChainHistoryItem]
