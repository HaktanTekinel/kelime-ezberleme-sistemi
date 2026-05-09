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
	picture_url varchar(255) NULL,
	audio_url varchar(255) NULL,
	topic varchar(80) NULL,
	difficulty_level int4 DEFAULT 1 NOT NULL,
	created_by int8 NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT words_pkey PRIMARY KEY (id)
);


-- public.words foreign keys

ALTER TABLE public.words ADD CONSTRAINT words_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

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

-- public.password_reset_tokens definition

-- Drop table

-- DROP TABLE public.password_reset_tokens;

CREATE TABLE public.password_reset_tokens (
	id bigserial NOT NULL,
	token varchar(128) NOT NULL,
	user_id int8 NOT NULL,
	expires_at timestamp NULL,
	is_used bool DEFAULT false NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
	CONSTRAINT password_reset_tokens_token_key UNIQUE (token)
);


-- public.password_reset_tokens foreign keys

ALTER TABLE public.password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
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
	next_review_at timestamp NULL,
	is_learned bool DEFAULT false NOT NULL,
	reset_count int4 DEFAULT 0 NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT uq_user_word UNIQUE (user_id, word_id),
	CONSTRAINT user_word_progress_current_stage_check CHECK (((current_stage >= 0) AND (current_stage <= 6))),
	CONSTRAINT user_word_progress_pkey PRIMARY KEY (id)
);


-- public.user_word_progress foreign keys

ALTER TABLE public.user_word_progress ADD CONSTRAINT user_word_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_word_progress ADD CONSTRAINT user_word_progress_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.words(id) ON DELETE CASCADE;
-- public.quiz_sessions definition

-- Drop table

-- DROP TABLE public.quiz_sessions;

CREATE TABLE public.quiz_sessions (
	id bigserial NOT NULL,
	user_id int8 NOT NULL,
	session_type varchar(30) NOT NULL,
	total_questions int4 DEFAULT 0 NOT NULL,
	correct_count int4 DEFAULT 0 NOT NULL,
	wrong_count int4 DEFAULT 0 NOT NULL,
	skipped_count int4 DEFAULT 0 NOT NULL,
	started_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	finished_at timestamp NULL,
	CONSTRAINT quiz_sessions_pkey PRIMARY KEY (id)
);


-- public.quiz_sessions foreign keys

ALTER TABLE public.quiz_sessions ADD CONSTRAINT quiz_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
-- public.quiz_answers definition

-- Drop table

-- DROP TABLE public.quiz_answers;

CREATE TABLE public.quiz_answers (
	id bigserial NOT NULL,
	quiz_session_id int8 NOT NULL,
	user_id int8 NOT NULL,
	word_id int8 NOT NULL,
	selected_answer text NULL,
	correct_answer text NOT NULL,
	is_correct bool NOT NULL,
	question_type varchar(30) NOT NULL,
	response_time_ms int4 NULL,
	answered_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT quiz_answers_pkey PRIMARY KEY (id)
);


-- public.quiz_answers foreign keys

ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_quiz_session_id_fkey FOREIGN KEY (quiz_session_id) REFERENCES public.quiz_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.words(id) ON DELETE CASCADE;
-- public.word_samples definition

-- Drop table

-- DROP TABLE public.word_samples;

CREATE TABLE public.word_samples (
	id bigserial NOT NULL,
	word_id int8 NOT NULL,
	sample_text varchar(500) NOT NULL,
	sample_order int4 DEFAULT 1 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT word_samples_pkey PRIMARY KEY (id)
);


-- public.word_samples foreign keys

ALTER TABLE public.word_samples ADD CONSTRAINT word_samples_word_id_fkey FOREIGN KEY (word_id) REFERENCES public.words(id) ON DELETE CASCADE;
-- public.word_chain_stories definition

-- Drop table

-- DROP TABLE public.word_chain_stories;

CREATE TABLE public.word_chain_stories (
	id bigserial NOT NULL,
	user_id int8 NOT NULL,
	prompt_words_json jsonb NOT NULL,
	story_text text NOT NULL,
	image_url text NULL,
	llm_model_name varchar(100) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT word_chain_stories_pkey PRIMARY KEY (id)
);


-- public.word_chain_stories foreign keys

ALTER TABLE public.word_chain_stories ADD CONSTRAINT word_chain_stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
-- public.wordle_games definition

-- Drop table

-- DROP TABLE public.wordle_games;

CREATE TABLE public.wordle_games (
	id bigserial NOT NULL,
	user_id int8 NOT NULL,
	target_word_id int8 NOT NULL,
	status varchar(20) DEFAULT 'active'::character varying NOT NULL,
	attempt_count int4 DEFAULT 0 NOT NULL,
	started_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	finished_at timestamp NULL,
	CONSTRAINT wordle_games_pkey PRIMARY KEY (id)
);


-- public.wordle_games foreign keys

ALTER TABLE public.wordle_games ADD CONSTRAINT wordle_games_target_word_id_fkey FOREIGN KEY (target_word_id) REFERENCES public.words(id) ON DELETE CASCADE;
ALTER TABLE public.wordle_games ADD CONSTRAINT wordle_games_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
-- public.report_snapshots definition

-- Drop table

-- DROP TABLE public.report_snapshots;

CREATE TABLE public.report_snapshots (
	id bigserial NOT NULL,
	user_id int8 NOT NULL,
	report_date date NOT NULL,
	total_learned_words int4 DEFAULT 0 NOT NULL,
	success_rate numeric(5, 2) DEFAULT 0.00 NOT NULL,
	weak_topics_json jsonb NULL,
	strong_topics_json jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT report_snapshots_pkey PRIMARY KEY (id)
);


-- public.report_snapshots foreign keys

ALTER TABLE public.report_snapshots ADD CONSTRAINT report_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
