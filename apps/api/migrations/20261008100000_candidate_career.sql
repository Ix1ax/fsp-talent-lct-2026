-- +goose Up

-- Места работы кандидата. Месяц хранится датой на первое число месяца; пустой ended_on значит «по настоящее время».
CREATE TABLE candidate_experiences (
    id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id  uuid         NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    company       text         NOT NULL CHECK (char_length(company) BETWEEN 1 AND 200),
    position      text         NOT NULL CHECK (char_length(position) BETWEEN 1 AND 200),
    started_on    date         NOT NULL CHECK (started_on = date_trunc('month', started_on)::date),
    ended_on      date         CHECK (ended_on = date_trunc('month', ended_on)::date),
    description   text         NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CHECK (ended_on IS NULL OR ended_on >= started_on)
);

CREATE INDEX candidate_experiences_candidate_idx ON candidate_experiences (candidate_id, started_on DESC);

-- Образование кандидата. Год окончания может быть будущим: кандидат учится сейчас.
CREATE TABLE candidate_education (
    id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id     uuid         NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    level            varchar(24)  NOT NULL CHECK (level IN ('secondary', 'vocational', 'incomplete_higher', 'higher', 'bachelor', 'master', 'phd', 'doctor')),
    institution      text         NOT NULL CHECK (char_length(institution) BETWEEN 1 AND 200),
    specialty        text         NOT NULL DEFAULT '' CHECK (char_length(specialty) <= 200),
    graduation_year  smallint     NOT NULL CHECK (graduation_year BETWEEN 1950 AND 2100),
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX candidate_education_candidate_idx ON candidate_education (candidate_id, graduation_year DESC);

-- +goose Down

DROP TABLE candidate_education;
DROP TABLE candidate_experiences;
