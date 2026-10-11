-- +goose Up

-- Привязка к реестру отделена от входа в приложение. Реальный адаптер заменит mock без изменения профиля.
CREATE TABLE fsp_links (
    candidate_id    uuid         PRIMARY KEY REFERENCES candidate_profiles (id) ON DELETE CASCADE,
    participant_id  text         NOT NULL UNIQUE,
    source          text         NOT NULL,
    linked_at       timestamptz  NOT NULL DEFAULT clock_timestamp(),
    synced_at       timestamptz,
    sync_status     text         NOT NULL CHECK (sync_status IN ('ready', 'empty', 'unavailable'))
);

CREATE TABLE fsp_achievements (
    candidate_id    uuid         NOT NULL REFERENCES fsp_links (candidate_id) ON DELETE CASCADE,
    external_id     text         NOT NULL,
    event_id        text         NOT NULL,
    event_name      text         NOT NULL,
    discipline      text         NOT NULL,
    occurred_on     date         NOT NULL,
    result          text         NOT NULL,
    place           integer      CHECK (place > 0),
    source          text         NOT NULL,
    PRIMARY KEY (candidate_id, external_id)
);

-- +goose Down

DROP TABLE fsp_achievements;
DROP TABLE fsp_links;
