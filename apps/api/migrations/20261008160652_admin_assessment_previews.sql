-- +goose Up
-- Отдельное хранение: пробное прохождение никогда не попадает в кандидатские попытки и агрегаты.
CREATE TABLE assessment_previews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
    template_id uuid NOT NULL,
    template_version integer NOT NULL,
    stack_skill_id uuid NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','expired')),
    started_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    time_limit_sec integer NOT NULL,
    pass_score numeric(5,2) NOT NULL,
    finished_at timestamptz,
    result jsonb,
    idempotency_key varchar(128),
    retain_until timestamptz NOT NULL,
    UNIQUE(admin_id,idempotency_key),
    CHECK(expires_at > started_at),
    CHECK((status='in_progress') = (result IS NULL))
);
CREATE INDEX assessment_previews_owner_idx ON assessment_previews(admin_id,status);
CREATE INDEX assessment_previews_retention_idx ON assessment_previews(retain_until);
CREATE TABLE assessment_preview_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    preview_id uuid NOT NULL REFERENCES assessment_previews(id) ON DELETE CASCADE,
    question_id uuid NOT NULL,
    version integer NOT NULL,
    position integer NOT NULL,
    skill_id uuid NOT NULL,
    skill_name text NOT NULL,
    difficulty smallint NOT NULL,
    weight numeric(10,4) NOT NULL CHECK(weight>0),
    kind varchar(16) NOT NULL,
    prompt jsonb NOT NULL,
    grading_spec jsonb NOT NULL,
    answer jsonb,
    UNIQUE(preview_id,position)
);

-- +goose Down
DROP TABLE assessment_preview_questions;
DROP TABLE assessment_previews;
