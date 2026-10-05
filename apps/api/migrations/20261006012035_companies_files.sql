-- +goose Up
-- Содержимое лежит в S3. Эта таблица общая для документов, логотипов и будущих файлов соискателей.
CREATE TABLE files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid REFERENCES users(id),
    bucket text NOT NULL,
    object_key text NOT NULL,
    purpose varchar(32) NOT NULL,
    original_name text,
    media_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    checksum_sha256 varchar(64),
    visibility varchar(16) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deleting', 'deleted')),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE (bucket, object_key)
);
CREATE INDEX files_owner_user_id_idx ON files(owner_user_id);
CREATE TABLE companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
    description text,
    inn varchar(12) CHECK (inn ~ '^([0-9]{10}|[0-9]{12})$'),
    contact_email text NOT NULL,
    contact_url text,
    logo_file_id uuid REFERENCES files(id),
    verification_status varchar(16) NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX companies_inn_unique ON companies(inn) WHERE inn IS NOT NULL;
CREATE TABLE company_members (
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id),
    role varchar(16) NOT NULL CHECK (role IN ('owner', 'recruiter', 'viewer')),
    status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (company_id, user_id)
);
CREATE INDEX company_members_user_id_idx ON company_members(user_id, company_id);
-- У компании может быть несколько документов. Один файл принадлежит только одной компании.
CREATE TABLE company_documents (
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    file_id uuid NOT NULL UNIQUE REFERENCES files(id),
    PRIMARY KEY (company_id, file_id)
);

-- +goose Down
DROP TABLE company_documents;
DROP TABLE company_members;
DROP TABLE companies;
DROP TABLE files;
