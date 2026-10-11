package entity

import (
	"errors"
	"time"
)

var (
	ErrForbidden   = errors.New("Профиль кандидата или согласие на обработку недоступны")
	ErrUnavailable = errors.New("Реестр ФСП временно недоступен; сохранённые достижения не изменены")
	ErrNotLinked   = errors.New("Сначала привяжите ФСП ID")
	ErrConflict    = errors.New("ФСП ID уже связан с другим профилем")
)

type Identity struct{ Issuer, Subject string }

// Achievement подтверждён самим фактом получения из реестра, ручная модерация не предусмотрена.
type Achievement struct {
	ID         string `json:"id"`
	EventID    string `json:"event_id"`
	EventName  string `json:"event_name"`
	Discipline string `json:"discipline"`
	OccurredOn string `json:"occurred_on"`
	Result     string `json:"result"`
	Place      *int   `json:"place"`
	Source     string `json:"source"`
}

type Record struct {
	ParticipantID string
	Source        string
	Items         []Achievement
}

type Link struct {
	ParticipantID string     `json:"participant_id"`
	Source        string     `json:"source"`
	LinkedAt      time.Time  `json:"linked_at"`
	SyncedAt      *time.Time `json:"synced_at"`
	SyncStatus    string     `json:"sync_status"`
}

type Profile struct {
	Link  *Link         `json:"link"`
	Items []Achievement `json:"items"`
}
