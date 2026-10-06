package config

import (
	"fmt"
	"net/url"
	"os"
	"regexp"
)

var policyVersion = regexp.MustCompile(`^[A-Za-z0-9._-]{1,32}$`)

type Config struct {
	OIDCAllowHTTP                                            bool
	Env, Addr, DatabaseURL, RedisAddr, RedisPassword         string
	S3Endpoint, S3Region, S3AccessKey, S3SecretKey, S3Bucket string
	OIDCIssuer, OIDCClientID, OIDCInternalURL, CORSOrigins   string
	// Версия политики обработки данных; кандидат подтверждает согласие именно с ней.
	PrivacyPolicyVersion string
}

func Load() (Config, error) {
	c := Config{
		OIDCAllowHTTP:   os.Getenv("OIDC_ALLOW_HTTP") == "true",
		Env:             value("APP_ENV", "development"),
		Addr:            value("HTTP_ADDR", ":8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		RedisAddr:       value("REDIS_ADDR", "localhost:6379"),
		RedisPassword:   os.Getenv("REDIS_PASSWORD"),
		S3Endpoint:      os.Getenv("S3_ENDPOINT"),
		S3Region:        value("S3_REGION", "us-east-1"),
		S3AccessKey:     os.Getenv("S3_ACCESS_KEY"),
		S3SecretKey:     os.Getenv("S3_SECRET_KEY"),
		S3Bucket:        os.Getenv("S3_BUCKET"),
		OIDCIssuer:      os.Getenv("OIDC_ISSUER"),
		OIDCClientID:    os.Getenv("OIDC_CLIENT_ID"),
		OIDCInternalURL: os.Getenv("OIDC_INTERNAL_URL"),
		CORSOrigins:     value("CORS_ALLOWED_ORIGINS", "*"),

		PrivacyPolicyVersion: value("PRIVACY_POLICY_VERSION", "2026-10-07"),
	}
	for name, v := range map[string]string{"DATABASE_URL": c.DatabaseURL, "REDIS_PASSWORD": c.RedisPassword, "S3_ENDPOINT": c.S3Endpoint, "S3_ACCESS_KEY": c.S3AccessKey, "S3_SECRET_KEY": c.S3SecretKey, "S3_BUCKET": c.S3Bucket} {
		if v == "" {
			return c, fmt.Errorf("Необходимо указать %s", name)
		}
	}
	if !policyVersion.MatchString(c.PrivacyPolicyVersion) {
		return c, fmt.Errorf("Недопустимое значение PRIVACY_POLICY_VERSION: до 32 символов из латиницы, цифр, точки, дефиса и подчёркивания")
	}
	if (c.OIDCIssuer == "") != (c.OIDCClientID == "") {
		return c, fmt.Errorf("OIDC_ISSUER и OIDC_CLIENT_ID нужно указать вместе")
	}
	if c.Env != "development" && c.Env != "production" && c.Env != "test" {
		return c, fmt.Errorf("Недопустимое значение APP_ENV")
	}
	if c.Env == "production" && c.OIDCIssuer == "" {
		return c, fmt.Errorf("Для рабочего окружения необходимо настроить OIDC")
	}
	for name, v := range map[string]string{"S3_ENDPOINT": c.S3Endpoint, "OIDC_ISSUER": c.OIDCIssuer, "OIDC_INTERNAL_URL": c.OIDCInternalURL} {
		if v == "" {
			continue
		}
		u, err := url.Parse(v)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return c, fmt.Errorf("Некорректный URL в %s", name)
		}
		if name == "OIDC_ISSUER" && c.Env == "production" && u.Scheme != "https" && !c.OIDCAllowHTTP {
			return c, fmt.Errorf("Для OIDC по HTTP на тестовом сервере укажите OIDC_ALLOW_HTTP=true")
		}
	}
	return c, nil
}
func value(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
