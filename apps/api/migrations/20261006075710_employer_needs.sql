-- +goose Up

-- Общие справочники нужны и работодателям, и соискателям. Код стабилен, название можно менять.
CREATE TABLE specializations (
    id      smallint     PRIMARY KEY,
    code    varchar(64)  NOT NULL UNIQUE,
    name    text         NOT NULL,
    active  boolean      NOT NULL DEFAULT true
);

CREATE TABLE grades (
    id    smallint     PRIMARY KEY,
    code  varchar(32)  NOT NULL UNIQUE,
    name  text         NOT NULL,
    rank  smallint     NOT NULL UNIQUE
);

CREATE TABLE skills (
    id       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    code     varchar(64)  NOT NULL UNIQUE,
    name     text         NOT NULL,
    aliases  text[]       NOT NULL DEFAULT '{}',
    active   boolean      NOT NULL DEFAULT true
);

CREATE TABLE work_formats (
    id    smallint     PRIMARY KEY,
    code  varchar(32)  NOT NULL UNIQUE,
    name  text         NOT NULL
);

INSERT INTO specializations (id, code, name) VALUES
    (1, 'backend',   'Бэкенд'),
    (2, 'frontend',  'Фронтенд'),
    (3, 'fullstack', 'Фулстек'),
    (4, 'qa',        'Тестирование'),
    (5, 'devops',    'DevOps'),
    (6, 'data',      'Данные и аналитика'),
    (7, 'mobile',    'Мобильная разработка'),
    (8, 'security',  'Информационная безопасность');

INSERT INTO grades (id, code, name, rank) VALUES
    (1, 'intern', 'Стажёр', 1),
    (2, 'junior', 'Junior', 2),
    (3, 'middle', 'Middle', 3),
    (4, 'senior', 'Senior', 4);

INSERT INTO work_formats (id, code, name) VALUES
    (1, 'office', 'Офис'),
    (2, 'hybrid', 'Гибрид'),
    (3, 'remote', 'Удалённо');

INSERT INTO skills (id, code, name, aliases) VALUES
    ('00000000-0000-4000-8000-000000000001', 'go',         'Go',           ARRAY['golang']),
    ('00000000-0000-4000-8000-000000000002', 'javascript', 'JavaScript',   ARRAY['js']),
    ('00000000-0000-4000-8000-000000000003', 'typescript', 'TypeScript',   ARRAY['ts']),
    ('00000000-0000-4000-8000-000000000004', 'react',      'React',        ARRAY['reactjs']),
    ('00000000-0000-4000-8000-000000000005', 'python',     'Python',       ARRAY['py']),
    ('00000000-0000-4000-8000-000000000006', 'java',       'Java',         ARRAY[]::text[]),
    ('00000000-0000-4000-8000-000000000007', 'postgresql', 'PostgreSQL',   ARRAY['postgres', 'pgsql']),
    ('00000000-0000-4000-8000-000000000008', 'redis',      'Redis',        ARRAY[]::text[]),
    ('00000000-0000-4000-8000-000000000009', 'docker',     'Docker',       ARRAY[]::text[]),
    ('00000000-0000-4000-8000-000000000010', 'kubernetes', 'Kubernetes',   ARRAY['k8s']),
    ('00000000-0000-4000-8000-000000000011', 'git',        'Git',          ARRAY[]::text[]),
    ('00000000-0000-4000-8000-000000000012', 'sql',        'SQL',          ARRAY[]::text[]),
    ('00000000-0000-4000-8000-000000000013', 'linux',      'Linux',        ARRAY[]::text[]),
    ('00000000-0000-4000-8000-000000000014', 'nextjs',     'Next.js',      ARRAY['next', 'next.js']),
    ('00000000-0000-4000-8000-000000000015', 'testing',    'Тестирование', ARRAY['qa', 'тесты']),
    ('00000000-0000-4000-8000-000000000016', 'csharp',     'C#',           ARRAY['csharp', 'dotnet', '.net']);

CREATE TABLE employer_needs (
    id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         uuid         NOT NULL REFERENCES companies (id),
    created_by         uuid         NOT NULL REFERENCES users (id),
    specialization_id  smallint     NOT NULL REFERENCES specializations (id),
    grade_id           smallint     REFERENCES grades (id),
    title              text         NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    description        text         NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 10000),
    salary_from_rub    bigint       CHECK (salary_from_rub BETWEEN 0 AND 1000000000),
    salary_to_rub      bigint       CHECK (salary_to_rub BETWEEN 0 AND 1000000000),
    city               text,
    timezone           varchar(64),
    status             varchar(16)  NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at         timestamptz  NOT NULL DEFAULT now(),
    CHECK (salary_from_rub IS NULL OR salary_to_rub IS NULL OR salary_from_rub <= salary_to_rub)
);

CREATE INDEX employer_needs_company_status_idx ON employer_needs (company_id, status, created_at DESC, id DESC);

CREATE INDEX employer_needs_created_by_idx ON employer_needs (created_by);

CREATE TABLE need_skills (
    need_id   uuid           NOT NULL REFERENCES employer_needs (id) ON DELETE CASCADE,
    skill_id  uuid           NOT NULL REFERENCES skills (id),
    required  boolean        NOT NULL,
    weight    numeric(6, 2)  NOT NULL CHECK (weight BETWEEN 0.01 AND 100),
    PRIMARY KEY (need_id, skill_id)
);

CREATE TABLE need_work_formats (
    need_id         uuid      NOT NULL REFERENCES employer_needs (id) ON DELETE CASCADE,
    work_format_id  smallint  NOT NULL REFERENCES work_formats (id),
    PRIMARY KEY (need_id, work_format_id)
);

-- +goose Down

DROP TABLE need_work_formats;
DROP TABLE need_skills;
DROP TABLE employer_needs;
DROP TABLE work_formats;
DROP TABLE skills;
DROP TABLE grades;
DROP TABLE specializations;
