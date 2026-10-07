package config

import (
	"strings"
	"testing"
)

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

func TestProductionHTTPRequiresExplicitSetting(t *testing.T) {
	validEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("OIDC_ISSUER", "http://89.104.69.242:8081/realms/fsp")
	t.Setenv("OIDC_CLIENT_ID", "fsp-api")
	t.Setenv("OIDC_ALLOW_HTTP", "")
	if _, err := Load(); err == nil {
		t.Fatal("HTTP разрешён без явной настройки тестового окружения")
	}
	t.Setenv("OIDC_ALLOW_HTTP", "true")
	if _, err := Load(); err != nil {
		t.Fatal(err)
	}
}

func TestPrivacyPolicyVersion(t *testing.T) {
	validEnv(t)
	c, err := Load()
	if err != nil || c.PrivacyPolicyVersion != "2026-10-07" {
		t.Fatalf("версия по умолчанию: %q (%v)", c.PrivacyPolicyVersion, err)
	}
	t.Setenv("PRIVACY_POLICY_VERSION", "v2")
	if c, err = Load(); err != nil || c.PrivacyPolicyVersion != "v2" {
		t.Fatalf("заданная версия: %q (%v)", c.PrivacyPolicyVersion, err)
	}
	for _, bad := range []string{"с пробелом", "a b", "версия-на-русском", strings.Repeat("a", 33)} {
		t.Setenv("PRIVACY_POLICY_VERSION", bad)
		if _, err := Load(); err == nil || !strings.Contains(err.Error(), "PRIVACY_POLICY_VERSION") {
			t.Fatalf("версия %q принята или ошибка без имени переменной: %v", bad, err)
		}
	}
}

func TestAssessmentRetakeDays(t *testing.T) {
	validEnv(t)
	c, err := Load()
	if err != nil || c.AssessmentRetakeDays != 7 {
		t.Fatalf("по умолчанию: %d (%v)", c.AssessmentRetakeDays, err)
	}
	t.Setenv("ASSESSMENT_RETAKE_DAYS", "30")
	if c, err = Load(); err != nil || c.AssessmentRetakeDays != 30 {
		t.Fatalf("заданное значение: %d (%v)", c.AssessmentRetakeDays, err)
	}
	for _, bad := range []string{"0", "366", "-1", "abc", "1.5", ""} {
		t.Setenv("ASSESSMENT_RETAKE_DAYS", bad)
		if bad == "" {
			continue
		}
		if _, err := Load(); err == nil || !strings.Contains(err.Error(), "ASSESSMENT_RETAKE_DAYS") {
			t.Fatalf("значение %q принято или ошибка без имени переменной: %v", bad, err)
		}
	}
}
