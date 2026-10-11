-- +goose Up
ALTER TABLE companies
    ADD COLUMN verification_version integer NOT NULL DEFAULT 0 CHECK(verification_version>=0),
    ADD COLUMN verification_requested_at timestamptz,
    ADD COLUMN verification_reviewed_at timestamptz,
    ADD COLUMN verification_reviewed_by uuid REFERENCES admin_accounts(id),
    ADD COLUMN verification_reason text CHECK(length(verification_reason)<=2000),
    ADD COLUMN verification_file_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX companies_verification_queue_idx ON companies(verification_status,verification_requested_at,id);
CREATE INDEX users_status_role_idx ON users(status,role,created_at DESC,id DESC);
ALTER TABLE company_daily_tasks ADD COLUMN moderation_status varchar(16) NOT NULL DEFAULT 'published'
    CHECK(moderation_status IN ('published','hidden'));

ALTER TABLE employer_needs ADD COLUMN moderation_status varchar(16) NOT NULL DEFAULT 'published'
    CHECK(moderation_status IN ('published','hidden'));
ALTER TABLE employer_needs ADD CONSTRAINT employer_needs_hidden_archived CHECK(moderation_status<>'hidden' OR status='archived');
ALTER TABLE company_daily_tasks ADD CONSTRAINT company_daily_tasks_hidden_closed CHECK(moderation_status<>'hidden' OR status='closed');

CREATE TABLE admin_operation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_admin_id uuid REFERENCES admin_accounts(id),
    actor_user_id uuid REFERENCES users(id),
    action varchar(64) NOT NULL,
    entity_type varchar(32) NOT NULL,
    entity_id uuid NOT NULL,
    old_status varchar(16),
    new_status varchar(16),
    reason text CHECK(length(reason)<=2000),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK(actor_admin_id IS NULL OR actor_user_id IS NULL)
);
CREATE INDEX admin_operation_events_entity_idx ON admin_operation_events(entity_type,entity_id,created_at DESC,id DESC);
CREATE INDEX admin_operation_events_actor_idx ON admin_operation_events(actor_admin_id,created_at DESC);

-- Подтверждение относится к юридическому имени/ИНН и документам конкретной заявки.
-- +goose StatementBegin
CREATE FUNCTION invalidate_company_identity_verification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.verification_status IN ('pending','verified') AND
       (NEW.name IS DISTINCT FROM OLD.name OR NEW.inn IS DISTINCT FROM OLD.inn) THEN
        NEW.verification_status := 'unverified';
        NEW.verification_version := OLD.verification_version+1;
        NEW.verification_requested_at := NULL;
        NEW.verification_reviewed_at := NULL;
        NEW.verification_reviewed_by := NULL;
        NEW.verification_reason := NULL;
        NEW.verification_file_ids := '{}';
        INSERT INTO admin_operation_events(action,entity_type,entity_id,old_status,new_status,reason)
        VALUES('company.verification_invalidated','company',OLD.id,OLD.verification_status,'unverified','Изменены название или ИНН компании');
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER companies_identity_verification BEFORE UPDATE OF name,inn ON companies
    FOR EACH ROW EXECUTE FUNCTION invalidate_company_identity_verification();
CREATE FUNCTION invalidate_company_document_verification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item record;
BEGIN
    IF OLD.status='ready' AND NEW.status<>'ready' THEN
        FOR item IN SELECT id,verification_status FROM companies
            WHERE verification_status IN ('pending','verified') AND OLD.id=ANY(verification_file_ids) FOR UPDATE LOOP
            UPDATE companies SET verification_status='unverified',verification_version=verification_version+1,
                verification_requested_at=NULL,verification_reviewed_at=NULL,verification_reviewed_by=NULL,
                verification_reason=NULL,verification_file_ids='{}' WHERE id=item.id;
            INSERT INTO admin_operation_events(action,entity_type,entity_id,old_status,new_status,reason)
            VALUES('company.verification_invalidated','company',item.id,item.verification_status,'unverified','Удалён документ заявки на подтверждение');
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER files_company_verification AFTER UPDATE OF status ON files
    FOR EACH ROW EXECUTE FUNCTION invalidate_company_document_verification();
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER files_company_verification ON files;
DROP FUNCTION invalidate_company_document_verification();
DROP TRIGGER companies_identity_verification ON companies;
DROP FUNCTION invalidate_company_identity_verification();
DROP TABLE admin_operation_events;
-- Скрытые задания остаются закрытыми при откате поддержки модерации.
UPDATE company_daily_tasks SET status='closed' WHERE moderation_status='hidden';
ALTER TABLE company_daily_tasks DROP CONSTRAINT company_daily_tasks_hidden_closed;
ALTER TABLE company_daily_tasks DROP COLUMN moderation_status;
ALTER TABLE employer_needs DROP CONSTRAINT employer_needs_hidden_archived;
ALTER TABLE employer_needs DROP COLUMN moderation_status;
DROP INDEX users_status_role_idx;
DROP INDEX companies_verification_queue_idx;
UPDATE companies SET verification_status='unverified' WHERE verification_status='pending';
ALTER TABLE companies DROP COLUMN verification_version,DROP COLUMN verification_requested_at,
    DROP COLUMN verification_reviewed_at,DROP COLUMN verification_reviewed_by,
    DROP COLUMN verification_reason,DROP COLUMN verification_file_ids;
