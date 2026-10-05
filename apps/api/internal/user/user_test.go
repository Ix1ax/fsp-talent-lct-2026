package user

import (
	"context"
	"errors"
	"testing"
)

type fakeStore struct {
	users map[string]User
}

func (f *fakeStore) FindByIdentity(_ context.Context, issuer, subject string) (User, error) {
	if u, ok := f.users[issuer+"|"+subject]; ok {
		return u, nil
	}
	return User{}, ErrNotFound
}

func (f *fakeStore) Create(_ context.Context, issuer, subject, role string) (User, error) {
	key := issuer + "|" + subject
	if _, ok := f.users[key]; ok {
		return User{}, ErrExists
	}
	u := User{ID: "id-" + subject, Role: role, Status: StatusActive}
	f.users[key] = u
	return u, nil
}

func TestRegister(t *testing.T) {
	for _, tc := range []struct {
		role string
		err  error
	}{
		{RoleCandidate, nil},
		{RoleEmployer, nil},
		{RoleAdmin, ErrInvalidRole},
		{"", ErrInvalidRole},
		{"superuser", ErrInvalidRole},
	} {
		s := NewService(&fakeStore{users: map[string]User{}})
		u, err := s.Register(context.Background(), "iss", "sub", tc.role)
		if !errors.Is(err, tc.err) {
			t.Fatalf("роль %q: ожидали %v, получили %v", tc.role, tc.err, err)
		}
		if err == nil && u.Role != tc.role {
			t.Fatalf("роль %q не сохранена: %+v", tc.role, u)
		}
	}
}

func TestRegisterTwice(t *testing.T) {
	s := NewService(&fakeStore{users: map[string]User{}})
	if _, err := s.Register(context.Background(), "iss", "sub", RoleCandidate); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Register(context.Background(), "iss", "sub", RoleEmployer); !errors.Is(err, ErrExists) {
		t.Fatalf("повторная регистрация должна вернуть ErrExists, получили %v", err)
	}
}

func TestResolve(t *testing.T) {
	store := &fakeStore{users: map[string]User{
		"iss|ok":      {ID: "1", Role: RoleCandidate, Status: StatusActive},
		"iss|blocked": {ID: "2", Role: RoleCandidate, Status: "blocked"},
		"iss|deleted": {ID: "3", Role: RoleEmployer, Status: "deleted"},
	}}
	s := NewService(store)
	if _, err := s.Resolve(context.Background(), "iss", "ok"); err != nil {
		t.Fatal(err)
	}
	for sub, want := range map[string]error{"blocked": ErrInactive, "deleted": ErrInactive, "missing": ErrNotFound} {
		if _, err := s.Resolve(context.Background(), "iss", sub); !errors.Is(err, want) {
			t.Fatalf("%s: ожидали %v, получили %v", sub, want, err)
		}
	}
}
