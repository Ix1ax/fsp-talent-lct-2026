-- +goose Up

-- Попытки прохождения теста. Шаблон и задания копируются в попытку при старте, поэтому правки банка её не меняют.
CREATE TABLE assessment_attempts (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id      uuid          NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    template_id       uuid          NOT NULL REFERENCES assessment_templates (id),
    specialization_id smallint      NOT NULL REFERENCES specializations (id),
    grade_id          smallint      NOT NULL REFERENCES grades (id),
    status            varchar(16)   NOT NULL CHECK (status IN ('active', 'passed', 'failed', 'expired')),
    started_at        timestamptz   NOT NULL DEFAULT clock_timestamp(),
    deadline_at       timestamptz   NOT NULL,
    finished_at       timestamptz,
    time_limit_sec    integer       NOT NULL CHECK (time_limit_sec > 0),
    pass_score        numeric(5,2)  NOT NULL CHECK (pass_score BETWEEN 1 AND 100),
    score_percent     numeric(5,2)  CHECK (score_percent BETWEEN 0 AND 100),
    CHECK ((status = 'active') = (finished_at IS NULL)),
    CHECK ((status = 'active') = (score_percent IS NULL))
);

-- Не больше одной активной попытки на кандидата.
CREATE UNIQUE INDEX assessment_attempts_one_active_idx ON assessment_attempts (candidate_id) WHERE status = 'active';
CREATE INDEX assessment_attempts_pair_idx ON assessment_attempts (candidate_id, specialization_id, grade_id, finished_at DESC);
CREATE INDEX assessment_attempts_template_idx ON assessment_attempts (template_id);

CREATE TABLE attempt_questions (
    id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          uuid          NOT NULL REFERENCES assessment_attempts (id) ON DELETE CASCADE,
    position            smallint      NOT NULL CHECK (position >= 1),
    question_version_id uuid          NOT NULL REFERENCES assessment_question_versions (id),
    skill_id            uuid          NOT NULL REFERENCES skills (id),
    difficulty          smallint      NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    points              numeric(10,4) NOT NULL CHECK (points > 0),
    prompt_snapshot     jsonb         NOT NULL,
    grading_snapshot    jsonb         NOT NULL,
    UNIQUE (attempt_id, position)
);

CREATE INDEX attempt_questions_version_idx ON attempt_questions (question_version_id);

CREATE TABLE attempt_answers (
    attempt_question_id uuid          PRIMARY KEY REFERENCES attempt_questions (id) ON DELETE CASCADE,
    answer              jsonb         NOT NULL,
    answered_at         timestamptz   NOT NULL DEFAULT clock_timestamp(),
    is_correct          boolean,
    awarded             numeric(10,4) CHECK (awarded >= 0)
);

-- Подтверждения навыков. Вес источника задаёт код. По навыку хранится лучший результат теста.
CREATE TABLE skill_evidence (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id uuid         NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    skill_id     uuid         NOT NULL REFERENCES skills (id),
    source       varchar(16)  NOT NULL CHECK (source IN ('test')),
    level        smallint     NOT NULL CHECK (level BETWEEN 1 AND 5),
    attempt_id   uuid         NOT NULL REFERENCES assessment_attempts (id) ON DELETE CASCADE,
    updated_at   timestamptz  NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (candidate_id, skill_id, source)
);

CREATE TABLE grade_history (
    id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id      uuid         NOT NULL REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    specialization_id smallint     NOT NULL REFERENCES specializations (id),
    grade_id          smallint     NOT NULL REFERENCES grades (id),
    attempt_id        uuid         NOT NULL UNIQUE REFERENCES assessment_attempts (id) ON DELETE CASCADE,
    achieved_at       timestamptz  NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX grade_history_candidate_idx ON grade_history (candidate_id, specialization_id, grade_id);

-- Текущая категория кандидата: пара последнего успешного теста.
CREATE TABLE candidate_categories (
    candidate_id      uuid         PRIMARY KEY REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    specialization_id smallint     NOT NULL REFERENCES specializations (id),
    grade_id          smallint     NOT NULL REFERENCES grades (id),
    attempt_id        uuid         NOT NULL REFERENCES assessment_attempts (id) ON DELETE CASCADE,
    confirmed_at      timestamptz  NOT NULL DEFAULT clock_timestamp()
);

-- +goose StatementBegin
CREATE FUNCTION attempt_closed_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status <> 'active' THEN
        RAISE EXCEPTION 'Закрытая попытка тестирования не изменяется' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;
-- +goose StatementEnd

CREATE TRIGGER attempt_closed_immutable BEFORE UPDATE ON assessment_attempts
    FOR EACH ROW EXECUTE FUNCTION attempt_closed_immutable();

-- +goose StatementBegin
CREATE FUNCTION attempt_question_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Снимок задания попытки не изменяется' USING ERRCODE = 'check_violation';
END $$;
-- +goose StatementEnd

CREATE TRIGGER attempt_question_immutable BEFORE UPDATE ON attempt_questions
    FOR EACH ROW EXECUTE FUNCTION attempt_question_immutable();

-- +goose StatementBegin
CREATE FUNCTION attempt_answer_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    attempt_status text;
BEGIN
    SELECT a.status INTO attempt_status FROM attempt_questions q JOIN assessment_attempts a ON a.id = q.attempt_id WHERE q.id = NEW.attempt_question_id;
    IF attempt_status <> 'active' THEN
        RAISE EXCEPTION 'Ответы закрытой попытки не изменяются' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;
-- +goose StatementEnd

CREATE TRIGGER attempt_answer_guard BEFORE INSERT OR UPDATE ON attempt_answers
    FOR EACH ROW EXECUTE FUNCTION attempt_answer_guard();

-- +goose Down

DROP TRIGGER attempt_answer_guard ON attempt_answers;
DROP FUNCTION attempt_answer_guard();
DROP TRIGGER attempt_question_immutable ON attempt_questions;
DROP FUNCTION attempt_question_immutable();
DROP TRIGGER attempt_closed_immutable ON assessment_attempts;
DROP FUNCTION attempt_closed_immutable();
DROP TABLE candidate_categories;
DROP TABLE grade_history;
DROP TABLE skill_evidence;
DROP TABLE attempt_answers;
DROP TABLE attempt_questions;
DROP TABLE assessment_attempts;
