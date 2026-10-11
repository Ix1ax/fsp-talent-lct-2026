package web_test

import (
	"context"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type noContacts struct{}

func (noContacts) PutContacts(context.Context, string, entity.ContactsInput) (entity.Contacts, error) {
	return entity.Contacts{}, nil
}
func (noContacts) Contacts(context.Context, string) (entity.Contacts, error) {
	return entity.Contacts{}, entity.ErrContactsNotFound
}

// Слишком большое тело JSON даёт 413 с нейтральным сообщением, а не 500 и не сообщение про аватар.
func TestOversizedJSONBodies(t *testing.T) {
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{
		Candidates:        candidateservice.NewProfileService(&memProfiles{byUser: map[string]entity.Profile{}}),
		CandidateContacts: candidateservice.NewContactsService(noContacts{}),
	})
	e.Store.Users[testutil.Issuer+"|cand"] = user.User{ID: "u-cand", Role: "candidate", Status: "active"}
	big := `{"note":"` + strings.Repeat("a", 3<<20) + `"}`
	for _, tc := range []struct{ method, path string }{
		{"POST", "/api/v1/me/profile"},
		{"PATCH", "/api/v1/me/profile"},
		{"PUT", "/api/v1/me/contacts"},
	} {
		w := e.Do(t, tc.method, tc.path, e.Token(t, "cand"), big)
		if w.Code != 413 || testutil.ErrorCode(t, w) != "request_too_large" || strings.Contains(w.Body.String(), "Аватар") {
			t.Fatalf("%s %s: %d %s, ожидали 413 request_too_large без упоминания аватара", tc.method, tc.path, w.Code, w.Body)
		}
	}
}
