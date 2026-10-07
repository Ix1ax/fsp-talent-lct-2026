-- +goose Up

-- Существующие навыки уже считаются одобренными. active по-прежнему отвечает за архивирование.
ALTER TABLE skills
    ADD COLUMN moderation_status varchar(16) NOT NULL DEFAULT 'approved'
        CHECK (moderation_status IN ('approved', 'pending', 'rejected', 'merged')),
    ADD COLUMN submitted_by uuid REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN submitted_at timestamptz,
    ADD COLUMN name_key text GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED,
    ADD CONSTRAINT skills_moderation_active_check CHECK (moderation_status = 'approved' OR NOT active);

-- Регистр и лишние пробелы не создают отдельные записи.
CREATE UNIQUE INDEX skills_name_key_idx ON skills (name_key);
CREATE INDEX skills_pending_idx ON skills (submitted_at, id) WHERE moderation_status = 'pending';
CREATE INDEX skills_submitted_by_idx ON skills (submitted_by, submitted_at);

-- +goose Down

-- Неодобренные навыки остаются выключенными и при откате не становятся публичными.
DROP INDEX skills_submitted_by_idx;
DROP INDEX skills_pending_idx;
DROP INDEX skills_name_key_idx;
ALTER TABLE skills
    DROP CONSTRAINT skills_moderation_active_check,
    DROP COLUMN name_key,
    DROP COLUMN submitted_at,
    DROP COLUMN submitted_by,
    DROP COLUMN moderation_status;
