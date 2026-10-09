-- +goose Up

CREATE TABLE company_daily_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES companies(id),
    created_by uuid NOT NULL REFERENCES users(id),
    title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    description text NOT NULL DEFAULT '' CHECK (length(description)<=10000),
    specialization_id smallint REFERENCES specializations(id),
    grade_id smallint REFERENCES grades(id),
    file_id uuid NOT NULL UNIQUE REFERENCES files(id),
    status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    deadline_at timestamptz,
    published_at timestamptz NOT NULL DEFAULT statement_timestamp(),
    published_on date GENERATED ALWAYS AS ((published_at AT TIME ZONE 'Europe/Moscow')::date) STORED,
    CONSTRAINT company_daily_tasks_day_unique UNIQUE(company_id,published_on),
    CHECK (deadline_at IS NULL OR deadline_at>published_at)
);
CREATE INDEX company_daily_tasks_published_idx ON company_daily_tasks(published_at DESC,id DESC);
CREATE INDEX company_daily_tasks_specialization_idx ON company_daily_tasks(specialization_id,grade_id,published_at DESC);
CREATE INDEX company_daily_tasks_created_by_idx ON company_daily_tasks(created_by);

CREATE TABLE company_task_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES company_daily_tasks(id),
    candidate_id uuid NOT NULL REFERENCES candidate_profiles(id),
    file_id uuid NOT NULL UNIQUE REFERENCES files(id),
    status varchar(16) NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewed')),
    submitted_at timestamptz NOT NULL DEFAULT statement_timestamp(),
    score smallint CHECK(score BETWEEN 0 AND 100),
    feedback text CHECK(length(btrim(feedback)) BETWEEN 1 AND 5000),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES users(id),
    CONSTRAINT company_task_submissions_candidate_unique UNIQUE(task_id,candidate_id),
    CHECK ((status='submitted' AND score IS NULL AND feedback IS NULL AND reviewed_at IS NULL AND reviewed_by IS NULL)
       OR (status='reviewed' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND (score IS NOT NULL OR feedback IS NOT NULL))),
    CHECK(reviewed_at IS NULL OR reviewed_at>=submitted_at)
);
CREATE INDEX company_task_submissions_candidate_idx ON company_task_submissions(candidate_id,submitted_at DESC,id DESC);
CREATE INDEX company_task_submissions_task_idx ON company_task_submissions(task_id,status,submitted_at DESC,id DESC);
CREATE INDEX company_task_submissions_reviewer_idx ON company_task_submissions(reviewed_by);

-- +goose Down
DROP TABLE company_task_submissions;
DROP TABLE company_daily_tasks;
