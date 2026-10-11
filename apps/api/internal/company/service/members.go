package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
)

type MemberStore interface {
	ListMembers(context.Context, string, string, int, int) ([]entity.Member, int64, error)
	UpdateMember(context.Context, string, string, string, string) (entity.Member, error)
	RemoveMember(context.Context, string, string, string) error
	CreateInvitation(context.Context, string, string, entity.InvitationInput, string) (entity.Invitation, error)
	ListInvitations(context.Context, string, string, int, int) ([]entity.Invitation, int64, error)
	RevokeInvitation(context.Context, string, string, string) error
	AcceptInvitation(context.Context, string, string, string) (entity.Member, error)
}

type MemberService struct{ store MemberStore }

func NewMemberService(store MemberStore) *MemberService { return &MemberService{store: store} }
func (s *MemberService) List(ctx context.Context, user, company string, limit, offset int) ([]entity.Member, int64, error) {
	return s.store.ListMembers(ctx, user, company, limit, offset)
}
func (s *MemberService) Update(ctx context.Context, user, company, member, role string) (entity.Member, error) {
	if err := entity.ValidateMemberRole(role); err != nil {
		return entity.Member{}, err
	}
	return s.store.UpdateMember(ctx, user, company, member, role)
}
func (s *MemberService) Remove(ctx context.Context, user, company, member string) error {
	return s.store.RemoveMember(ctx, user, company, member)
}
func (s *MemberService) Invite(ctx context.Context, user, company string, in entity.InvitationInput) (entity.Invitation, error) {
	if err := in.Normalize(); err != nil {
		return entity.Invitation{}, err
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return entity.Invitation{}, err
	}
	token := hex.EncodeToString(b)
	i, err := s.store.CreateInvitation(ctx, user, company, in, invitationHash(token))
	if err == nil {
		i.Token = token
	}
	return i, err
}
func (s *MemberService) Invitations(ctx context.Context, user, company string, limit, offset int) ([]entity.Invitation, int64, error) {
	return s.store.ListInvitations(ctx, user, company, limit, offset)
}
func (s *MemberService) Revoke(ctx context.Context, user, company, id string) error {
	return s.store.RevokeInvitation(ctx, user, company, id)
}
func (s *MemberService) Accept(ctx context.Context, user, email, token string) (entity.Member, error) {
	if len(token) != 64 {
		return entity.Member{}, entity.ErrInvitationInvalid
	}
	if _, err := hex.DecodeString(token); err != nil {
		return entity.Member{}, entity.ErrInvitationInvalid
	}
	// Email приходит только из проверенного JWT, а не из тела запроса.
	return s.store.AcceptInvitation(ctx, user, strings.ToLower(strings.TrimSpace(email)), invitationHash(token))
}
func invitationHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
