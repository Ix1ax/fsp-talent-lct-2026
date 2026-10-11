package demoseed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const dataset = "jury-v1"

type account struct {
	Number                     int
	Email, FirstName, LastName string
}

var accounts = []account{
	{1, "candidate@demo.fsp.test", "Алексей", "Демо"},
	{2, "employer@demo.fsp.test", "Работодатель", "Демо"},
	{3, "recruiter@demo.fsp.test", "Рекрутер", "Демо"},
	{4, "viewer@demo.fsp.test", "Наблюдатель", "Демо"},
	{37, "new-candidate@demo.fsp.test", "Новый кандидат", "Демо"},
}

type kcUser struct {
	ID              string              `json:"id,omitempty"`
	Username        string              `json:"username"`
	Email           string              `json:"email"`
	FirstName       string              `json:"firstName"`
	LastName        string              `json:"lastName"`
	Enabled         bool                `json:"enabled"`
	EmailVerified   bool                `json:"emailVerified"`
	Attributes      map[string][]string `json:"attributes"`
	Credentials     []kcCredential      `json:"credentials,omitempty"`
	RequiredActions []string            `json:"requiredActions"`
}
type kcCredential struct {
	Type      string `json:"type"`
	Value     string `json:"value"`
	Temporary bool   `json:"temporary"`
}
type keycloak struct {
	base, realm, token string
	client             *http.Client
}

// Errors deliberately contain only status codes, never server bodies, credentials or tokens.
func (k *keycloak) request(ctx context.Context, method, path string, data any, target any) (int, error) {
	var body io.Reader
	if data != nil {
		b, err := json.Marshal(data)
		if err != nil {
			return 0, err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, k.base+path, body)
	if err != nil {
		return 0, fmt.Errorf("некорректный URL Keycloak")
	}
	req.Header.Set("Authorization", "Bearer "+k.token)
	req.Header.Set("Content-Type", "application/json")
	res, err := k.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("Keycloak недоступен")
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return res.StatusCode, fmt.Errorf("Keycloak: HTTP %d", res.StatusCode)
	}
	if target != nil {
		if err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(target); err != nil {
			return res.StatusCode, fmt.Errorf("некорректный ответ Keycloak")
		}
	}
	return res.StatusCode, nil
}
func (k *keycloak) login(ctx context.Context, username, password string) error {
	form := url.Values{"client_id": {"admin-cli"}, "grant_type": {"password"}, "username": {username}, "password": {password}}
	req, err := http.NewRequestWithContext(ctx, "POST", k.base+"/realms/master/protocol/openid-connect/token", strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("некорректный URL Keycloak")
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := k.client.Do(req)
	if err != nil {
		return fmt.Errorf("Keycloak недоступен")
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return fmt.Errorf("вход администратора Keycloak: HTTP %d", res.StatusCode)
	}
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&token); err != nil || token.AccessToken == "" {
		return fmt.Errorf("Keycloak не вернул токен администратора")
	}
	k.token = token.AccessToken
	return nil
}
func (k *keycloak) ensureUser(ctx context.Context, a account) (string, error) {
	path := "/admin/realms/" + url.PathEscape(k.realm) + "/users"
	lookup := func() (string, error) {
		var found []kcUser
		_, err := k.request(ctx, "GET", path+"?exact=true&username="+url.QueryEscape(a.Email), nil, &found)
		if err != nil {
			return "", err
		}
		if len(found) == 0 {
			return "", nil
		}
		if len(found) != 1 || found[0].ID == "" || found[0].Username != a.Email || len(found[0].Attributes["fsp_demo"]) != 1 || found[0].Attributes["fsp_demo"][0] != dataset {
			return "", fmt.Errorf("логин %s уже занят аккаунтом вне демо-набора", a.Email)
		}
		return found[0].ID, nil
	}
	id, err := lookup()
	if err != nil || id != "" {
		return id, err
	}
	user := kcUser{Username: a.Email, Email: a.Email, FirstName: a.FirstName, LastName: a.LastName, Enabled: true, EmailVerified: true,
		Attributes: map[string][]string{"fsp_demo": {dataset}}, RequiredActions: []string{}, Credentials: []kcCredential{{Type: "password", Value: "1234", Temporary: false}}}
	status, err := k.request(ctx, "POST", path, user, nil)
	if err != nil && status != 409 {
		return "", err
	}
	id, err = lookup()
	if err == nil && id == "" {
		err = fmt.Errorf("созданный аккаунт Keycloak не найден")
	}
	return id, err
}

// Keycloak 26 drops attributes not declared in User Profile. Add only our
// admin-only marker while retaining the realm's existing profile configuration.
func (k *keycloak) ensureMarkerProfile(ctx context.Context) error {
	path := "/admin/realms/" + url.PathEscape(k.realm) + "/users/profile"
	var profile map[string]json.RawMessage
	if _, err := k.request(ctx, "GET", path, nil, &profile); err != nil {
		return err
	}
	var attrs []map[string]json.RawMessage
	if err := json.Unmarshal(profile["attributes"], &attrs); err != nil {
		return fmt.Errorf("некорректная конфигурация User Profile")
	}
	for _, attr := range attrs {
		var name string
		_ = json.Unmarshal(attr["name"], &name)
		if name != "fsp_demo" {
			continue
		}
		var permissions struct{ View, Edit []string }
		_ = json.Unmarshal(attr["permissions"], &permissions)
		if len(permissions.View) != 1 || permissions.View[0] != "admin" || len(permissions.Edit) != 1 || permissions.Edit[0] != "admin" {
			return fmt.Errorf("атрибут fsp_demo должен быть доступен только администратору")
		}
		return nil
	}
	attrs = append(attrs, map[string]json.RawMessage{"name": json.RawMessage(`"fsp_demo"`), "displayName": json.RawMessage(`"FSP jury dataset"`), "multivalued": json.RawMessage(`false`), "permissions": json.RawMessage(`{"view":["admin"],"edit":["admin"]}`)})
	b, err := json.Marshal(attrs)
	if err != nil {
		return err
	}
	profile["attributes"] = b
	_, err = k.request(ctx, "PUT", path, profile, nil)
	return err
}
