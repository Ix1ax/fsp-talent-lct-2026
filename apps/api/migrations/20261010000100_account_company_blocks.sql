-- +goose Up
ALTER TABLE companies
    ADD COLUMN status varchar(16) NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
    ADD COLUMN blocked_reason text CHECK(length(blocked_reason) BETWEEN 1 AND 2000),
    ADD COLUMN blocked_at timestamptz,
    ADD CONSTRAINT companies_block_metadata CHECK(
        (status='blocked' AND blocked_reason IS NOT NULL AND blocked_at IS NOT NULL) OR
        (status='active' AND blocked_reason IS NULL AND blocked_at IS NULL));
CREATE INDEX companies_access_status_idx ON companies(status,created_at DESC,id DESC);
ALTER TABLE users ADD COLUMN blocked_reason text CHECK(length(blocked_reason) BETWEEN 1 AND 2000),
    ADD COLUMN blocked_at timestamptz;
-- Сохраняем уже действующие блокировки и их последнюю причину.
UPDATE users u SET blocked_reason=COALESCE((SELECT e.reason FROM admin_operation_events e
    WHERE e.entity_type='user' AND e.entity_id=u.id AND e.new_status='blocked'
    ORDER BY e.created_at DESC,e.id DESC LIMIT 1),'Учётная запись заблокирована администратором'),
    blocked_at=COALESCE((SELECT e.created_at FROM admin_operation_events e
    WHERE e.entity_type='user' AND e.entity_id=u.id AND e.new_status='blocked'
    ORDER BY e.created_at DESC,e.id DESC LIMIT 1),u.updated_at)
WHERE u.status='blocked';
ALTER TABLE users ADD CONSTRAINT users_block_metadata CHECK(
    (status='blocked' AND blocked_reason IS NOT NULL AND blocked_at IS NOT NULL) OR
    (status<>'blocked' AND blocked_reason IS NULL AND blocked_at IS NULL));
-- Системные изменения/удаление пользователя также сохраняют согласованность метаданных.
-- +goose StatementBegin
CREATE FUNCTION normalize_user_block_metadata() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status='blocked' THEN
        NEW.blocked_reason := COALESCE(NEW.blocked_reason,'Учётная запись заблокирована администратором');
        NEW.blocked_at := COALESCE(NEW.blocked_at,clock_timestamp());
    ELSE
        NEW.blocked_reason := NULL;
        NEW.blocked_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER users_block_metadata BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION normalize_user_block_metadata();
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER users_block_metadata ON users;
DROP FUNCTION normalize_user_block_metadata();
ALTER TABLE users DROP CONSTRAINT users_block_metadata,DROP COLUMN blocked_reason,DROP COLUMN blocked_at;
DROP INDEX companies_access_status_idx;
ALTER TABLE companies DROP CONSTRAINT companies_block_metadata,DROP COLUMN status,DROP COLUMN blocked_reason,DROP COLUMN blocked_at;
