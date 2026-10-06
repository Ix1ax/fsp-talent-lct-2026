-- +goose Up

-- Токен выдаётся один раз владельцу. В базе хранится только его SHA-256.
CREATE TABLE company_invitations (
    id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        uuid         NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    created_by        uuid         NOT NULL REFERENCES users (id),
    email             text         NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
    role              varchar(16)  NOT NULL CHECK (role IN ('recruiter', 'viewer')),
    token_hash        varchar(64)  NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    status            varchar(16)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    created_at        timestamptz  NOT NULL DEFAULT now(),
    expires_at        timestamptz  NOT NULL DEFAULT now() + interval '7 days',
    accepted_by       uuid         REFERENCES users (id),
    accepted_at       timestamptz,
    CHECK (expires_at > created_at),
    CHECK ((status = 'accepted') = (accepted_by IS NOT NULL AND accepted_at IS NOT NULL))
);

CREATE UNIQUE INDEX company_invitations_pending_email_idx
    ON company_invitations (company_id, email) WHERE status = 'pending';
CREATE INDEX company_invitations_company_idx ON company_invitations (company_id, created_at DESC);

-- +goose Down

DROP TABLE company_invitations;
