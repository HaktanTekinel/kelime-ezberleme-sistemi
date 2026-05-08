from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(String(30), default="user", nullable=False)

    # Eski yapı ile uyumluluk için bırakıldı.
    # Asıl ayar user_settings.daily_new_word_count üzerinden okunur.
    daily_quiz_limit = Column(Integer, default=10, nullable=False)

    total_correct_answers = Column(Integer, default=0, nullable=False)
    total_wrong_answers = Column(Integer, default=0, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    settings = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    words = relationship("Word", back_populates="created_by_user")
    progress_items = relationship("UserWordProgress", back_populates="user")
    quiz_sessions = relationship("QuizSession", back_populates="user")
    quiz_answers = relationship("QuizAnswer", back_populates="user")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    daily_new_word_count = Column(Integer, default=10, nullable=False)
    quiz_question_count = Column(Integer, default=10, nullable=False)
    show_instant_feedback = Column(Boolean, default=True, nullable=False)
    allow_skip_questions = Column(Boolean, default=True, nullable=False)
    updated_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="settings")


class Word(Base):
    __tablename__ = "words"

    id = Column(BigInteger, primary_key=True, index=True)
    eng_word = Column(String(150), nullable=False, index=True)
    tur_word = Column(String(150), nullable=False)
    difficulty_level = Column(Integer, default=1, nullable=False)
    topic = Column(String(80), nullable=True)
    picture_url = Column(String(255), nullable=True)
    audio_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    created_by_user = relationship("User", back_populates="words")
    samples = relationship(
        "WordSample",
        back_populates="word",
        cascade="all, delete-orphan",
        order_by="WordSample.sample_order",
    )
    progress_items = relationship("UserWordProgress", back_populates="word")
    quiz_answers = relationship("QuizAnswer", back_populates="word")


class WordSample(Base):
    __tablename__ = "word_samples"

    id = Column(BigInteger, primary_key=True, index=True)
    word_id = Column(
        BigInteger,
        ForeignKey("words.id", ondelete="CASCADE"),
        nullable=False,
    )
    sample_text = Column(String(500), nullable=False)
    sample_order = Column(Integer, default=1, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    word = relationship("Word", back_populates="samples")


class UserWordProgress(Base):
    __tablename__ = "user_word_progress"
    __table_args__ = (UniqueConstraint("user_id", "word_id", name="uq_user_word"),)

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    word_id = Column(
        BigInteger,
        ForeignKey("words.id", ondelete="CASCADE"),
        nullable=False,
    )
    current_stage = Column(Integer, default=0, nullable=False)
    next_review_at = Column(TIMESTAMP, nullable=True)
    is_learned = Column(Boolean, default=False, nullable=False)
    consecutive_correct = Column(Integer, default=0, nullable=False)
    last_answer_correct = Column(Boolean, nullable=True)
    reset_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="progress_items")
    word = relationship("Word", back_populates="progress_items")


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_type = Column(String(30), default="daily", nullable=False)
    total_questions = Column(Integer, default=0, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)
    wrong_count = Column(Integer, default=0, nullable=False)
    skipped_count = Column(Integer, default=0, nullable=False)
    started_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    finished_at = Column(TIMESTAMP, nullable=True)

    user = relationship("User", back_populates="quiz_sessions")
    answers = relationship(
        "QuizAnswer",
        back_populates="quiz_session",
        cascade="all, delete-orphan",
    )


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(BigInteger, primary_key=True, index=True)
    quiz_session_id = Column(
        BigInteger,
        ForeignKey("quiz_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    word_id = Column(
        BigInteger,
        ForeignKey("words.id", ondelete="CASCADE"),
        nullable=False,
    )
    selected_answer = Column(Text, nullable=True)
    correct_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    question_type = Column(String(30), default="multiple_choice", nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    answered_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    quiz_session = relationship("QuizSession", back_populates="answers")
    user = relationship("User", back_populates="quiz_answers")
    word = relationship("Word", back_populates="quiz_answers")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(BigInteger, primary_key=True, index=True)
    token = Column(String(128), unique=True, nullable=False)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    expires_at = Column(TIMESTAMP, nullable=True)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class ReportSnapshot(Base):
    __tablename__ = "report_snapshots"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    report_date = Column(Date, server_default=func.current_date(), nullable=False)
    total_learned_words = Column(Integer, default=0, nullable=False)
    success_rate = Column(Numeric(5, 2), default=0, nullable=False)
    weak_topics_json = Column(JSON, nullable=True)
    strong_topics_json = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)


class WordleGame(Base):
    __tablename__ = "wordle_games"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_word_id = Column(
        BigInteger,
        ForeignKey("words.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(String(20), default="active", nullable=False)
    attempt_count = Column(Integer, default=0, nullable=False)
    started_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    finished_at = Column(TIMESTAMP, nullable=True)


class WordChainStory(Base):
    __tablename__ = "word_chain_stories"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    prompt_words_json = Column(JSON, nullable=False)
    story_text = Column(Text, nullable=False)
    summary_text = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    llm_model_name = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)