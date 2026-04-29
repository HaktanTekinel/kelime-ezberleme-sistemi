CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    role VARCHAR(30) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- public.words definition

-- Drop table

-- DROP TABLE public.words;

CREATE TABLE public.words (
	id bigserial NOT NULL,
	eng_word varchar(150) NOT NULL,
	tur_word varchar(150) NOT NULL,
	picture_url text NULL,
	audio_url text NULL,
	topic varchar(100) NULL,
	difficulty_level int4 DEFAULT 1 NOT NULL,
	created_by int8 NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT words_pkey PRIMARY KEY (id)
);


-- public.words foreign keys

ALTER TABLE public.words ADD CONSTRAINT words_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
-- public.user_settings definition

-- Drop table

-- DROP TABLE public.user_settings;

CREATE TABLE public.user_settings (
	id bigserial NOT NULL,
	user_id int8 NOT NULL,
	daily_new_word_count int4 DEFAULT 10 NOT NULL,
	quiz_question_count int4 DEFAULT 10 NOT NULL,
	show_instant_feedback bool DEFAULT true NOT NULL,
	allow_skip_questions bool DEFAULT true NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT user_settings_pkey PRIMARY KEY (id),
	CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);


-- public.user_settings foreign keys

ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
-- public.user_word_progress definition

-- Drop table

-- DROP TABLE public.user_word_progress;

CREATE TABLE public.user_word_progress (
	id bigserial NOT NULL,
	user_id int8 NOT NULL,
	word_id int8 NOT NULL,
	current_stage int4 DEFAULT 0 NOT NULL,
	consecutive_correct int4 DEFAULT 0 NOT NULL,
	last_answer_correct bool NULL,
	last_review_at timestamp NULL,
	next_review_at timestamp NULL,
	learned bool DEFAULT false NOT NULL,
	reset_count int4 DEFAULT 0 NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT uq_user_word UNIQUE (user_id, word_id),
	CONSTRAINT user_word_progress_current_stage_check CHECK (((current_stage >= 0) AND (current_stage <= 6))),
	CONSTRAINT user_word_progress_pkey PRIMARY KEY (id)
);


-- public.user_word_progress foreign keys

ALTER TABLE public.user_word_progress ADD CONSTRAINT user_word_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_word_progress ADD CONSTRAINT user_word_progress_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.words(id) ON DELETE CASCADE;
