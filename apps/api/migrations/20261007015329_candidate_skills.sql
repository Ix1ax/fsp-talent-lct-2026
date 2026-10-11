-- +goose Up

-- Навыки кандидата из общего справочника skills. claimed_level — самооценка; он может быть NULL для навыков,
-- которые позже создадут тесты или достижения ФСП. Источники подтверждения и их веса считает код.
CREATE TABLE candidate_skills (
    id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id   uuid         NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    skill_id       uuid         NOT NULL REFERENCES skills (id),
    claimed_level  smallint     CHECK (claimed_level BETWEEN 1 AND 5),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (candidate_id, skill_id)
);

CREATE INDEX candidate_skills_skill_idx ON candidate_skills (skill_id);

-- +goose Down

DROP TABLE candidate_skills;
