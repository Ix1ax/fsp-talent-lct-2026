-- +goose Up

-- Согласия кандидата на обработку данных (152-ФЗ). Новая выдача после отзыва — новая строка, история сохраняется.
CREATE TABLE candidate_consents (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind            varchar(16)  NOT NULL CHECK (kind IN ('processing', 'publication', 'ats_transfer')),
    policy_version  varchar(32)  NOT NULL CHECK (length(btrim(policy_version)) BETWEEN 1 AND 32),
    company_id      uuid         REFERENCES companies (id),
    granted_at      timestamptz  NOT NULL DEFAULT now(),
    revoked_at      timestamptz,
    CHECK ((kind = 'ats_transfer') = (company_id IS NOT NULL)),
    CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

-- Одно активное согласие на пару (пользователь, вид) или на тройку с компанией для ats_transfer.
CREATE UNIQUE INDEX candidate_consents_active_idx
    ON candidate_consents (user_id, kind, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE revoked_at IS NULL;

-- Приватные контакты кандидата. Работодателю они доступны только по принятому предложению.
CREATE TABLE candidate_contacts (
    user_id     uuid         PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    full_name   text         NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 200),
    email       text         NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
    phone       text         CHECK (length(phone) BETWEEN 5 AND 20),
    telegram    text         CHECK (telegram ~ '^[A-Za-z0-9_]{5,32}$'),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Аудит доступа и важных действий. В metadata нельзя класть персональные данные.
CREATE TABLE audit_events (
    id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id  uuid         REFERENCES users (id) ON DELETE SET NULL,
    action         varchar(64)  NOT NULL,
    entity_type    varchar(64)  NOT NULL,
    entity_id      uuid,
    metadata       jsonb        NOT NULL DEFAULT '{}',
    created_at     timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id, created_at DESC);

-- Профили, опубликованные до появления согласий, скрываем: публикация без согласия невозможна.
UPDATE candidate_profiles SET search_status = 'hidden', updated_at = now() WHERE search_status <> 'hidden';

-- +goose Down

DROP TABLE audit_events;
DROP TABLE candidate_contacts;
DROP TABLE candidate_consents;
