-- Story 1-5 backend uyumluluk migration dosyası
-- PostgreSQL için hazırlanmıştır. DBeaver/pgAdmin içinde proje_db üzerinde çalıştır.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_quiz_limit INTEGER NOT NULL DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_wrong_answers INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.words ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT NULL;

DO $$
BEGIN
    ALTER TABLE public.words
    ADD CONSTRAINT words_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    daily_new_word_count INTEGER NOT NULL DEFAULT 10,
    quiz_question_count INTEGER NOT NULL DEFAULT 10,
    show_instant_feedback BOOLEAN NOT NULL DEFAULT TRUE,
    allow_skip_questions BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    ALTER TABLE public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_type VARCHAR(30) NOT NULL DEFAULT 'daily',
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL
);

DO $$
BEGIN
    ALTER TABLE public.quiz_sessions
    ADD CONSTRAINT quiz_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id BIGSERIAL PRIMARY KEY,
    quiz_session_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    word_id BIGINT NOT NULL,
    selected_answer TEXT NULL,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    question_type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice',
    response_time_ms INTEGER NULL,
    answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    ALTER TABLE public.quiz_answers
    ADD CONSTRAINT quiz_answers_quiz_session_id_fkey
    FOREIGN KEY (quiz_session_id) REFERENCES public.quiz_sessions(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.quiz_answers
    ADD CONSTRAINT quiz_answers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.quiz_answers
    ADD CONSTRAINT quiz_answers_word_id_fkey
    FOREIGN KEY (word_id) REFERENCES public.words(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.report_snapshots (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_learned_words INTEGER NOT NULL DEFAULT 0,
    success_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    weak_topics_json JSONB NULL,
    strong_topics_json JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    ALTER TABLE public.report_snapshots
    ADD CONSTRAINT report_snapshots_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.word_chain_stories ADD COLUMN IF NOT EXISTS summary_text TEXT NULL;

INSERT INTO public.user_settings (user_id, daily_new_word_count, quiz_question_count)
SELECT id, COALESCE(daily_quiz_limit, 10), COALESCE(daily_quiz_limit, 10)
FROM public.users
ON CONFLICT (user_id) DO NOTHING;