from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class ORMBaseModel(BaseModel):
    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
	status: str = "success"
	message: str


class ForgotPasswordRequest(BaseModel):
	email: EmailStr


class ForgotPasswordResponse(BaseModel):
	status: str = "success"
	message: str
	reset_token: Optional[str] = None


class Token(BaseModel):
	access_token: str
	token_type: str = "bearer"


class TokenData(BaseModel):
	username: Optional[str] = None


class UserBase(BaseModel):
	username: str = Field(min_length=3, max_length=50)
	email: EmailStr


class UserCreate(UserBase):
	password: str


class UserLogin(BaseModel):
	username_or_email: str
	password: str


class UserRead(ORMBaseModel):
	id: int
	username: str
	email: str

	class Config:
		from_attributes = True


class PasswordUpdate(BaseModel):
	username: str
	new_password: str


class ResetPasswordRequest(BaseModel):
	reset_token: str
	new_password: str


class UserSettingsBase(BaseModel):
	daily_new_word_count: int = Field(default=10, ge=1, le=100)
	quiz_question_count: int = Field(default=10, ge=1, le=100)
	show_instant_feedback: bool = True
	allow_skip_questions: bool = True


class UserSettingsCreate(UserSettingsBase):
	user_id: int


class UserSettingsRead(ORMBaseModel):
	id: int
	user_id: int
	daily_new_word_count: int
	quiz_question_count: int
	show_instant_feedback: bool
	allow_skip_questions: bool
	updated_at: Optional[datetime] = None


class WordBase(BaseModel):
	eng_word: str = Field(min_length=1, max_length=150)
	tur_word: str = Field(min_length=1, max_length=150)
	difficulty_level: int = Field(default=1, ge=1, le=10)
	topic: Optional[str] = Field(default=None, max_length=80)
	picture_url: Optional[str] = None
	audio_url: Optional[str] = None


class WordCreate(WordBase):
	samples: List[str]


class WordRead(ORMBaseModel):
	id: int
	eng_word: str
	tur_word: str
	picture_url: Optional[str] = None

	class Config:
		from_attributes = True


class QuizQuestionRead(BaseModel):
	word_id: int
	eng_word: str
	picture_url: Optional[str] = None
	options: List[str]


class QuizDailyResponse(BaseModel):
	user_id: int
	total_questions: int
	due_count: int
	new_count: int
	questions: List[QuizQuestionRead]


class QuizAnswerRequest(BaseModel):
	user_id: int
	word_id: int
	selected_answer: str


class QuizAnswerResponse(BaseModel):
	user_id: int
	word_id: int
	is_correct: bool
	correct_answer: str
	current_stage: int
	next_review_at: Optional[datetime] = None
	is_learned: bool
	consecutive_correct: int
	reset_count: int


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


class UserWordProgressBase(BaseModel):
	user_id: int
	word_id: int
	current_stage: int = Field(default=0, ge=0, le=6)
	next_review_at: Optional[datetime] = None
	is_learned: bool = False
	consecutive_correct: int = Field(default=0, ge=0)
	last_answer_correct: Optional[bool] = None
	reset_count: int = Field(default=0, ge=0)


class UserWordProgressCreate(UserWordProgressBase):
	pass


class UserWordProgressUpdate(BaseModel):
	current_stage: Optional[int] = Field(default=None, ge=0, le=6)
	next_review_at: Optional[datetime] = None
	is_learned: Optional[bool] = None
	consecutive_correct: Optional[int] = Field(default=None, ge=0)
	last_answer_correct: Optional[bool] = None
	reset_count: Optional[int] = Field(default=None, ge=0)


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


class QuizSessionBase(BaseModel):
	session_type: str = Field(default="daily", max_length=30)
	total_questions: int = Field(default=0, ge=0)
	correct_count: int = Field(default=0, ge=0)
	wrong_count: int = Field(default=0, ge=0)
	skipped_count: int = Field(default=0, ge=0)
	started_at: Optional[datetime] = None
	finished_at: Optional[datetime] = None


class QuizSessionCreate(QuizSessionBase):
	user_id: int


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


class QuizAnswerBase(BaseModel):
	user_id: int
	word_id: int
	selected_answer: str
	correct_answer: str
	is_correct: bool
	question_type: str = Field(default="multiple_choice", max_length=50)
	response_time_ms: Optional[int] = Field(default=None, ge=0)
	answered_at: Optional[datetime] = None


class QuizAnswerCreate(QuizAnswerBase):
	quiz_session_id: int


class QuizAnswerRead(ORMBaseModel):
	id: int
	quiz_session_id: int
	user_id: int
	word_id: int
	selected_answer: str
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
	weak_topics_json: Optional[dict] = None
	strong_topics_json: Optional[dict] = None
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
	prompt_words_json: Optional[dict] = None
	story_text: Optional[str] = None
	image_url: Optional[str] = None
	llm_model_name: Optional[str] = None
	created_at: Optional[datetime] = None
