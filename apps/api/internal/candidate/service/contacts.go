package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

type ContactsStore interface {
	PutContacts(ctx context.Context, userID string, in entity.ContactsInput) (entity.Contacts, error)
	Contacts(ctx context.Context, userID string) (entity.Contacts, error)
}

type ContactsService struct{ store ContactsStore }

func NewContactsService(store ContactsStore) *ContactsService { return &ContactsService{store: store} }

func (s *ContactsService) Put(ctx context.Context, userID string, in entity.ContactsInput) (entity.Contacts, error) {
	if err := in.Normalize(); err != nil {
		return entity.Contacts{}, err
	}
	return s.store.PutContacts(ctx, userID, in)
}

func (s *ContactsService) Get(ctx context.Context, userID string) (entity.Contacts, error) {
	return s.store.Contacts(ctx, userID)
}
