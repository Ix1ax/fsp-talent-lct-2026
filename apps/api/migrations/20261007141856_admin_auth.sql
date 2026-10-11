-- +goose Up

-- Администраторы панели отделены от пользователей сайта и внешних идентичностей.
CREATE TABLE admin_accounts (
    id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    email          text         NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
    password_hash  text,
    role           varchar(16)  NOT NULL CHECK (role IN ('superadmin', 'admin')),
    status         varchar(16)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_by     uuid         REFERENCES admin_accounts (id),
    created_at     timestamptz  NOT NULL DEFAULT now(),
    CHECK (password_hash IS NOT NULL OR role = 'superadmin')
);

CREATE UNIQUE INDEX admin_accounts_superadmin_idx
    ON admin_accounts (role) WHERE role = 'superadmin';

-- Без начального пароля войти нельзя. Команда migrate up активирует эту запись из переменных окружения.
INSERT INTO admin_accounts (email, role) VALUES ('superadmin@fsp.local', 'superadmin');

-- В БД хранится только SHA-256 случайного токена, сам токен возвращается один раз при входе.
CREATE TABLE admin_sessions (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    uuid         NOT NULL REFERENCES admin_accounts (id) ON DELETE CASCADE,
    token_hash  bytea        NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    created_at  timestamptz  NOT NULL DEFAULT now(),
    expires_at  timestamptz  NOT NULL CHECK (expires_at > created_at)
);

CREATE INDEX admin_sessions_admin_idx ON admin_sessions (admin_id);
CREATE INDEX admin_sessions_expiry_idx ON admin_sessions (expires_at);

-- Ограничение входа работает между экземплярами API. Ключ — хеш, без почты и IP в открытом виде.
CREATE TABLE admin_login_limits (
    key_hash     bytea        PRIMARY KEY CHECK (octet_length(key_hash) = 32),
    attempts     integer      NOT NULL CHECK (attempts > 0),
    window_end   timestamptz  NOT NULL
);

-- +goose Down

DROP TABLE admin_login_limits;
DROP TABLE admin_sessions;
DROP TABLE admin_accounts;
