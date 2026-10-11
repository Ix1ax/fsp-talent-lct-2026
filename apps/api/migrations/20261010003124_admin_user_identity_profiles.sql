-- +goose Up

-- Только снимок проверенной OIDC-идентичности; паролей, токенов и сессий здесь нет.
ALTER TABLE external_identities
  ADD COLUMN email text,
  ADD COLUMN display_name text,
  ADD COLUMN profile_updated_at timestamptz,
  ADD COLUMN profile_token_issued_at timestamptz,
  ADD CONSTRAINT external_identity_profile_email CHECK (email IS NULL OR (email = btrim(email) AND length(email) BETWEEN 3 AND 254)),
  ADD CONSTRAINT external_identity_profile_name CHECK (display_name IS NULL OR (display_name = btrim(display_name) AND length(display_name) BETWEEN 1 AND 200));

-- +goose Down

ALTER TABLE external_identities
  DROP CONSTRAINT external_identity_profile_email,
  DROP CONSTRAINT external_identity_profile_name,
  DROP COLUMN profile_token_issued_at,
  DROP COLUMN profile_updated_at,
  DROP COLUMN display_name,
  DROP COLUMN email;
