from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, TIMESTAMP, UniqueConstraint, func
from database import Base
class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key=True, index=True)
	username = Column(String(50), unique=True, nullable=False)
	email = Column(String(255), unique=True, nullable=False)
	password_hash = Column(String, nullable=False)
	is_active = Column(Boolean, default=True, nullable=False)
	role = Column(String(30), default="user", nullable=False)
	daily_quiz_limit = Column(Integer, default=10, nullable=False)
	total_correct_answers = Column(Integer, default=0, nullable=False)
	total_wrong_answers = Column(Integer, default=0, nullable=False)
	created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
	updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)


class Word(Base):
	__tablename__ = "words"

	id = Column(Integer, primary_key=True, index=True)
	eng_word = Column(String(150), nullable=False)
	tur_word = Column(String(150), nullable=False)
	difficulty_level = Column(Integer, default=1, nullable=False)
	topic = Column(String(80), nullable=True)
	picture_url = Column(String(255), nullable=True)
	audio_url = Column(String(255), nullable=True)
	is_active = Column(Boolean, default=True, nullable=False)
	created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
	updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)


class WordSample(Base):
	__tablename__ = "word_samples"

	id = Column(Integer, primary_key=True, index=True)
	word_id = Column(Integer, ForeignKey("words.id"), nullable=False)
	sample_text = Column(String(500), nullable=False)
	sample_order = Column(Integer, default=1, nullable=False)
	created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class UserWordProgress(Base):
	__tablename__ = "user_word_progress"
	__table_args__ = (UniqueConstraint("user_id", "word_id", name="uq_user_word_progress_user_word"),)

	id = Column(Integer, primary_key=True, index=True)
	user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	word_id = Column(Integer, ForeignKey("words.id"), nullable=False)
	current_stage = Column(Integer, default=0, nullable=False)  # 0..6 spaced repetition stage
	next_review_at = Column(TIMESTAMP, nullable=True)
	is_learned = Column(Boolean, default=False, nullable=False)  # Becomes True at stage 6
	consecutive_correct = Column(Integer, default=0, nullable=False)
	last_answer_correct = Column(Boolean, nullable=True)
	reset_count = Column(Integer, default=0, nullable=False)
	updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False)


class PasswordResetToken(Base):
	__tablename__ = "password_reset_tokens"

	id = Column(Integer, primary_key=True, index=True)
	token = Column(String(128), unique=True, nullable=False)
	user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
	expires_at = Column(TIMESTAMP, nullable=True)
	is_used = Column(Boolean, default=False, nullable=False)
	created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
