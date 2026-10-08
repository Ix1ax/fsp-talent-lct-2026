-- +goose Up

-- Самооценка хранится отдельно от категории, которую присваивает только тест.
CREATE TABLE candidate_onboarding (
    candidate_id       uuid         PRIMARY KEY REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    industry           text         NOT NULL CHECK (char_length(industry) BETWEEN 1 AND 200),
    specialization_id  smallint     NOT NULL REFERENCES specializations (id),
    grade_id           smallint     NOT NULL REFERENCES grades (id),
    soft_skills        text[]       NOT NULL DEFAULT '{}' CHECK (cardinality(soft_skills) <= 20),
    updated_at         timestamptz  NOT NULL DEFAULT clock_timestamp()
);

-- +goose Down

DROP TABLE candidate_onboarding;
