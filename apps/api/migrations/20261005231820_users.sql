-- +goose Up

-- Пользователь приложения. Пароли и сессии хранит Keycloak, здесь только наш идентификатор и роль.
CREATE TABLE users (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    role        varchar(16)  NOT NULL CHECK (role IN ('candidate', 'employer', 'admin')),
    status      varchar(16)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'deleted')),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Связь пользователя с внешним аккаунтом Keycloak по паре (issuer, subject).
CREATE TABLE external_identities (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    issuer     text         NOT NULL,
    subject    text         NOT NULL,
    provider   varchar(32)  NOT NULL DEFAULT 'keycloak',
    linked_at  timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (issuer, subject)
);

CREATE INDEX external_identities_user_id_idx ON external_identities (user_id);

-- +goose Down

DROP TABLE external_identities;
DROP TABLE users;
