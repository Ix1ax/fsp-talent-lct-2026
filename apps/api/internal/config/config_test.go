package config

import "testing"

func validEnv(t *testing.T) {
	t.Helper()
	for k, v := range map[string]string{"APP_ENV": "test", "DATABASE_URL": "postgres://local/test", "REDIS_PASSWORD": "test", "S3_ENDPOINT": "http://localhost:8333", "S3_ACCESS_KEY": "test", "S3_SECRET_KEY": "test", "S3_BUCKET": "test", "OIDC_ISSUER": "", "OIDC_CLIENT_ID": ""} {
		t.Setenv(k, v)
	}
}
func TestLoad(t *testing.T) {
	validEnv(t)
	if _, err := Load(); err != nil {
		t.Fatal(err)
	}
}
func TestMissingSecret(t *testing.T) {
	validEnv(t)
	t.Setenv("S3_SECRET_KEY", "")
	if _, err := Load(); err == nil {
		t.Fatal("Настройки приняты без обязательного секрета")
	}
}
func TestProductionRequiresOIDC(t *testing.T) {
	validEnv(t)
	t.Setenv("APP_ENV", "production")
	if _, err := Load(); err == nil {
		t.Fatal("Настройки приняты без обязательного OIDC")
	}
}
func TestPartialOIDC(t *testing.T) {
	validEnv(t)
	t.Setenv("OIDC_CLIENT_ID", "api")
	if _, err := Load(); err == nil {
		t.Fatal("Приняты неполные настройки OIDC")
	}
}
