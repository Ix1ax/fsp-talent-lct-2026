-- +goose Up

-- Составной ключ не позволяет привязать предложение к потребности чужой компании.
ALTER TABLE employer_needs
    ADD CONSTRAINT employer_needs_id_company_unique UNIQUE (id, company_id);

-- Условия сохраняем на момент отправки. Изменение компании или потребности не меняет предложение.
-- Контактов кандидата здесь нет: их доступ проверяется отдельно после принятия.
CREATE TABLE candidate_offers (
    id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        uuid         NOT NULL REFERENCES companies (id),
    candidate_id      uuid         NOT NULL REFERENCES candidate_profiles (id),
    created_by        uuid         NOT NULL REFERENCES users (id),
    need_id           uuid,
    company_name      text         NOT NULL CHECK (length(btrim(company_name)) BETWEEN 1 AND 200),
    title             text         NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    description       text         NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 10000),
    salary_from_rub   bigint       NOT NULL CHECK (salary_from_rub BETWEEN 1 AND 1000000000),
    salary_to_rub     bigint       NOT NULL CHECK (salary_to_rub BETWEEN 1 AND 1000000000),
    contact_email     text         NOT NULL CHECK (length(btrim(contact_email)) BETWEEN 3 AND 254),
    contact_url       text         CHECK (length(contact_url) BETWEEN 1 AND 2048),
    status            varchar(16)  NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'accepted', 'rejected')),
    created_at        timestamptz  NOT NULL DEFAULT now(),
    viewed_at         timestamptz,
    responded_at      timestamptz,
    FOREIGN KEY (need_id, company_id) REFERENCES employer_needs (id, company_id),
    CHECK (salary_from_rub <= salary_to_rub),
    CHECK (viewed_at IS NULL OR viewed_at >= created_at),
    CHECK (responded_at IS NULL OR responded_at >= viewed_at),
    CHECK (
        (status = 'sent' AND viewed_at IS NULL AND responded_at IS NULL)
        OR (status = 'viewed' AND viewed_at IS NOT NULL AND responded_at IS NULL)
        OR (status IN ('accepted', 'rejected') AND viewed_at IS NOT NULL AND responded_at IS NOT NULL)
    )
);

CREATE INDEX candidate_offers_company_status_idx
    ON candidate_offers (company_id, status, created_at DESC, id DESC);
CREATE INDEX candidate_offers_candidate_status_idx
    ON candidate_offers (candidate_id, status, created_at DESC, id DESC);
CREATE INDEX candidate_offers_need_idx ON candidate_offers (need_id) WHERE need_id IS NOT NULL;
CREATE INDEX candidate_offers_created_by_idx ON candidate_offers (created_by);

-- +goose Down

DROP TABLE candidate_offers;
ALTER TABLE employer_needs DROP CONSTRAINT employer_needs_id_company_unique;
