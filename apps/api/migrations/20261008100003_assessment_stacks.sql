-- +goose Up
-- Основной стек — одобренный навык общего справочника. NULL означает исторический тест без выбранного стека.
ALTER TABLE assessment_templates ADD COLUMN stack_skill_id uuid REFERENCES skills (id);
ALTER TABLE assessment_attempts ADD COLUMN stack_skill_id uuid REFERENCES skills (id);
ALTER TABLE assessment_attempts ADD COLUMN stack_name text;
ALTER TABLE candidate_onboarding ADD COLUMN stack_skill_id uuid REFERENCES skills (id);

-- Только известные демошаблоны: пользовательским тестам и старым попыткам стек не приписывается.
UPDATE assessment_templates SET stack_skill_id = (SELECT id FROM skills WHERE code = 'go')
WHERE id IN ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000101');
UPDATE assessment_templates SET stack_skill_id = (SELECT id FROM skills WHERE code = 'javascript')
WHERE id IN ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000102');

ALTER TABLE assessment_templates DROP CONSTRAINT assessment_templates_specialization_id_grade_id_version_key;
DROP INDEX assessment_templates_published_idx;
CREATE UNIQUE INDEX assessment_templates_scope_version_idx
    ON assessment_templates (specialization_id, grade_id, COALESCE(stack_skill_id, '00000000-0000-0000-0000-000000000000'::uuid), version);
CREATE UNIQUE INDEX assessment_templates_published_idx
    ON assessment_templates (specialization_id, grade_id, COALESCE(stack_skill_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE status = 'published';
CREATE INDEX assessment_attempts_scope_idx ON assessment_attempts (candidate_id, specialization_id, stack_skill_id, grade_id);

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION assessment_template_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status <> 'draft' THEN
        IF NEW.specialization_id IS DISTINCT FROM OLD.specialization_id OR NEW.grade_id IS DISTINCT FROM OLD.grade_id
            OR NEW.stack_skill_id IS DISTINCT FROM OLD.stack_skill_id
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


-- +goose Down
DROP INDEX assessment_attempts_scope_idx;
DROP INDEX assessment_templates_scope_version_idx;
DROP INDEX assessment_templates_published_idx;
-- При нескольких стековых версиях откат требует предварительно разрешить конфликты старой пары.
ALTER TABLE assessment_templates ADD UNIQUE (specialization_id, grade_id, version);
CREATE UNIQUE INDEX assessment_templates_published_idx ON assessment_templates (specialization_id, grade_id) WHERE status = 'published';
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION assessment_template_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
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


ALTER TABLE candidate_onboarding DROP COLUMN stack_skill_id;
ALTER TABLE assessment_attempts DROP COLUMN stack_name;
ALTER TABLE assessment_attempts DROP COLUMN stack_skill_id;
ALTER TABLE assessment_templates DROP COLUMN stack_skill_id;
