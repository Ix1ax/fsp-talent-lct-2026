package entity

import "time"

// Interaction содержит только историю текущей компании с кандидатом.
// Viewed и HasOffer сохраняются после истечения 30-дневного срока.
type Interaction struct {
	HasOffer        bool       `json:"has_offer"`
	Viewed          bool       `json:"viewed"`
	LastViewedAt    *time.Time `json:"last_viewed_at"`
	LastOfferedAt   *time.Time `json:"last_offered_at"`
	NextAvailableAt *time.Time `json:"next_available_at"`
}
