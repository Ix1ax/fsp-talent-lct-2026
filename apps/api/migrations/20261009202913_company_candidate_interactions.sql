-- +goose Up

-- updated_at меняется при правках резюме, поэтому для стабильного порядка нужна отдельная дата.
-- Для уже существующих профилей используем сохранённую дату регистрации пользователя.
ALTER TABLE candidate_profiles ADD COLUMN created_at timestamptz;
UPDATE candidate_profiles p SET created_at=u.created_at FROM users u WHERE u.id=p.user_id;
ALTER TABLE candidate_profiles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE candidate_profiles ALTER COLUMN created_at SET DEFAULT now();

-- Просмотры и отправки общие для участников компании, но независимы от других компаний.
CREATE TABLE company_candidate_interactions (
    company_id      uuid        NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    candidate_id    uuid        NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    last_viewed_at  timestamptz NOT NULL,
    last_offered_at timestamptz,
    PRIMARY KEY (company_id, candidate_id)
);

-- Старые офферы также считаются просмотром и запускают срок с даты последней отправки.
INSERT INTO company_candidate_interactions (company_id, candidate_id, last_viewed_at, last_offered_at)
SELECT company_id, candidate_id, max(created_at), max(created_at)
FROM candidate_offers
GROUP BY company_id, candidate_id;

-- +goose Down

DROP TABLE company_candidate_interactions;
ALTER TABLE candidate_profiles DROP COLUMN created_at;
