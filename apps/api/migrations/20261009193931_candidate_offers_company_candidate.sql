-- +goose Up

CREATE INDEX candidate_offers_company_candidate_idx
    ON candidate_offers (company_id, candidate_id);

-- +goose Down

DROP INDEX candidate_offers_company_candidate_idx;
