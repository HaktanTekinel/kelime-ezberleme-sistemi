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
