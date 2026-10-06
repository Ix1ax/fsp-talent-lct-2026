package entity

import (
	"errors"
	"net/mail"
	"strings"
	"time"
)

var ErrMemberConflict = errors.New("сотрудник уже состоит в компании или приглашение уже существует")
var ErrInvitationInvalid = errors.New("приглашение недействительно или срок его действия истёк")

type Member struct {
	CompanyID string    `json:"company_id"`
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	JoinedAt  time.Time `json:"joined_at"`
}

type Invitation struct {
	ID        string    `json:"id"`
	CompanyID string    `json:"company_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	Token     string    `json:"token,omitempty"`
}

type InvitationInput struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (in *InvitationInput) Normalize() error {
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	address, err := mail.ParseAddress(in.Email)
	if err != nil || address.Address != in.Email || len(in.Email) > 254 {
		return invalid("Укажите корректный email без имени получателя")
	}
	return ValidateMemberRole(in.Role)
}

func ValidateMemberRole(role string) error {
	if role != "recruiter" && role != "viewer" {
		return invalid("Допустимые роли сотрудника: recruiter и viewer")
	}
	return nil
}
