-- +goose Up

-- Задания банка тестов. Содержимое лежит в неизменяемых версиях; админские действия пишутся в assessment_events.
CREATE TABLE assessment_questions (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id    uuid         NOT NULL REFERENCES skills (id),
    difficulty  smallint     NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    kind        varchar(16)  NOT NULL CHECK (kind IN ('choice', 'code_reading', 'short_answer')),
    active      boolean      NOT NULL DEFAULT true,
    created_by  uuid         REFERENCES admin_accounts (id) ON DELETE SET NULL,
    created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX assessment_questions_bucket_idx ON assessment_questions (skill_id, difficulty) WHERE active;

CREATE TABLE assessment_question_versions (
    id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id   uuid         NOT NULL REFERENCES assessment_questions (id) ON DELETE CASCADE,
    version       integer      NOT NULL CHECK (version >= 1),
    prompt        jsonb        NOT NULL,
    grading_spec  jsonb        NOT NULL,
    status        varchar(16)  NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by    uuid         REFERENCES admin_accounts (id) ON DELETE SET NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    published_at  timestamptz,
    UNIQUE (question_id, version)
);

-- Одна опубликованная версия на задание.
CREATE UNIQUE INDEX assessment_versions_published_idx ON assessment_question_versions (question_id) WHERE status = 'published';

-- Шаблон теста на пару (специализация, грейд).
CREATE TABLE assessment_templates (
    id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    specialization_id  smallint      NOT NULL REFERENCES specializations (id),
    grade_id           smallint      NOT NULL REFERENCES grades (id),
    version            integer       NOT NULL CHECK (version >= 1),
    time_limit_sec     integer       NOT NULL CHECK (time_limit_sec BETWEEN 300 AND 14400),
    pass_score         numeric(5, 2) NOT NULL CHECK (pass_score BETWEEN 1 AND 100),
    status             varchar(16)   NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by         uuid          REFERENCES admin_accounts (id) ON DELETE SET NULL,
    created_at         timestamptz   NOT NULL DEFAULT now(),
    published_at       timestamptz,
    UNIQUE (specialization_id, grade_id, version)
);

-- Один опубликованный шаблон на пару.
CREATE UNIQUE INDEX assessment_templates_published_idx ON assessment_templates (specialization_id, grade_id) WHERE status = 'published';

CREATE TABLE assessment_blueprints (
    id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     uuid           NOT NULL REFERENCES assessment_templates (id) ON DELETE CASCADE,
    skill_id        uuid           NOT NULL REFERENCES skills (id),
    difficulty      smallint       NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    question_count  smallint       NOT NULL CHECK (question_count BETWEEN 1 AND 50),
    weight          numeric(6, 2)  NOT NULL CHECK (weight BETWEEN 0.01 AND 100),
    UNIQUE (template_id, skill_id, difficulty)
);

-- Админские аккаунты отделены от users, поэтому у банка заданий свой журнал. Тексты заданий и правила в него не пишем.
CREATE TABLE assessment_events (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     uuid         REFERENCES admin_accounts (id) ON DELETE SET NULL,
    action       varchar(32)  NOT NULL CHECK (action IN ('question.created', 'question.version_created', 'question.version_published', 'question.archived', 'template.created', 'template.published', 'template.archived')),
    entity_type  varchar(32)  NOT NULL,
    entity_id    uuid         NOT NULL,
    created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX assessment_events_entity_idx ON assessment_events (entity_type, entity_id, created_at DESC);

-- Неизменяемость на уровне БД: опубликованную и архивную версию, шаблон не в статусе draft и его состав менять нельзя.
-- +goose StatementBegin
CREATE FUNCTION assessment_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status <> 'draft' THEN
        IF NEW.prompt IS DISTINCT FROM OLD.prompt OR NEW.grading_spec IS DISTINCT FROM OLD.grading_spec
            OR NEW.question_id IS DISTINCT FROM OLD.question_id OR NEW.version IS DISTINCT FROM OLD.version THEN
            RAISE EXCEPTION 'Содержимое опубликованной версии задания менять нельзя: создайте новую версию';
        END IF;
        -- Из опубликованной версии разрешён только переход в архив; возврат в черновик открыл бы правку содержимого.
        IF NEW.status <> OLD.status AND NOT (OLD.status = 'published' AND NEW.status = 'archived') THEN
            RAISE EXCEPTION 'Версию задания можно только перевести из опубликованной в архивную';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER assessment_version_immutable BEFORE UPDATE ON assessment_question_versions
    FOR EACH ROW EXECUTE FUNCTION assessment_version_immutable();

-- +goose StatementBegin
CREATE FUNCTION assessment_template_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status <> 'draft' THEN
        IF NEW.specialization_id IS DISTINCT FROM OLD.specialization_id OR NEW.grade_id IS DISTINCT FROM OLD.grade_id
            OR NEW.version IS DISTINCT FROM OLD.version OR NEW.time_limit_sec IS DISTINCT FROM OLD.time_limit_sec OR NEW.pass_score IS DISTINCT FROM OLD.pass_score THEN
            RAISE EXCEPTION 'Параметры опубликованного шаблона менять нельзя: создайте новую версию';
        END IF;
        IF NEW.status <> OLD.status AND NOT (OLD.status = 'published' AND NEW.status = 'archived') THEN
            RAISE EXCEPTION 'Шаблон можно только перевести из опубликованного в архивный';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER assessment_template_immutable BEFORE UPDATE ON assessment_templates
    FOR EACH ROW EXECUTE FUNCTION assessment_template_immutable();

-- +goose StatementBegin
CREATE FUNCTION assessment_blueprint_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    current_status text;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        SELECT status INTO current_status FROM assessment_templates WHERE id = OLD.template_id;
        IF current_status IS NOT NULL AND current_status <> 'draft' THEN
            RAISE EXCEPTION 'Состав опубликованного шаблона менять нельзя: создайте новую версию';
        END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        SELECT status INTO current_status FROM assessment_templates WHERE id = NEW.template_id;
        IF current_status IS NOT NULL AND current_status <> 'draft' THEN
            RAISE EXCEPTION 'Состав опубликованного шаблона менять нельзя: создайте новую версию';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER assessment_blueprint_immutable BEFORE INSERT OR UPDATE OR DELETE ON assessment_blueprints
    FOR EACH ROW EXECUTE FUNCTION assessment_blueprint_immutable();

-- +goose Down

DROP TRIGGER assessment_blueprint_immutable ON assessment_blueprints;
DROP FUNCTION assessment_blueprint_immutable();
DROP TRIGGER assessment_template_immutable ON assessment_templates;
DROP FUNCTION assessment_template_immutable();
DROP TRIGGER assessment_version_immutable ON assessment_question_versions;
DROP FUNCTION assessment_version_immutable();
DROP TABLE assessment_events;
DROP TABLE assessment_blueprints;
DROP TABLE assessment_templates;
DROP TABLE assessment_question_versions;
DROP TABLE assessment_questions;
