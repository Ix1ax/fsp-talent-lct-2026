-- +goose Up

-- Публичная часть профиля кандидата. Контакты, навыки и категория хранятся отдельно.
CREATE TABLE candidate_profiles (
    id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid         NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    avatar_file_id     uuid         REFERENCES files (id),
    headline           text         CHECK (length(headline) <= 200),
    summary            text         CHECK (length(summary) <= 10000),
    city               text         CHECK (length(city) <= 200),
    timezone           varchar(64),
    experience_months  integer      NOT NULL DEFAULT 0 CHECK (experience_months BETWEEN 0 AND 600),
    salary_min_rub     bigint       CHECK (salary_min_rub BETWEEN 0 AND 1000000000),
    search_status      varchar(16)  NOT NULL DEFAULT 'hidden' CHECK (search_status IN ('open', 'passive', 'hidden')),
    updated_at         timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE candidate_work_formats (
    candidate_id    uuid      NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    work_format_id  smallint  NOT NULL REFERENCES work_formats (id),
    PRIMARY KEY (candidate_id, work_format_id)
);

-- +goose Down

DROP TABLE candidate_work_formats;
DROP TABLE candidate_profiles;
