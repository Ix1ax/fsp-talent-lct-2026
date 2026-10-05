package config

import (
	"fmt"
	"net/url"
	"os"
)

type Config struct {
	Env, Addr, DatabaseURL, RedisAddr, RedisPassword         string
	S3Endpoint, S3Region, S3AccessKey, S3SecretKey, S3Bucket string
	OIDCIssuer, OIDCClientID                                 string
}

func Load() (Config, error) {
	c := Config{
		Env:           value("APP_ENV", "development"),
		Addr:          value("HTTP_ADDR", ":8080"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		RedisAddr:     value("REDIS_ADDR", "localhost:6379"),
		RedisPassword: os.Getenv("REDIS_PASSWORD"),
		S3Endpoint:    os.Getenv("S3_ENDPOINT"),
		S3Region:      value("S3_REGION", "us-east-1"),
		S3AccessKey:   os.Getenv("S3_ACCESS_KEY"),
		S3SecretKey:   os.Getenv("S3_SECRET_KEY"),
		S3Bucket:      os.Getenv("S3_BUCKET"),
		OIDCIssuer:    os.Getenv("OIDC_ISSUER"),
		OIDCClientID:  os.Getenv("OIDC_CLIENT_ID"),
	}
	for name, v := range map[string]string{"DATABASE_URL": c.DatabaseURL, "REDIS_PASSWORD": c.RedisPassword, "S3_ENDPOINT": c.S3Endpoint, "S3_ACCESS_KEY": c.S3AccessKey, "S3_SECRET_KEY": c.S3SecretKey, "S3_BUCKET": c.S3Bucket} {
		if v == "" {
			return c, fmt.Errorf("%s is required", name)
		}
	}
	if (c.OIDCIssuer == "") != (c.OIDCClientID == "") {
		return c, fmt.Errorf("OIDC_ISSUER and OIDC_CLIENT_ID must be set together")
	}
	if c.Env != "development" && c.Env != "production" && c.Env != "test" {
		return c, fmt.Errorf("invalid APP_ENV")
	}
	if c.Env == "production" && c.OIDCIssuer == "" {
		return c, fmt.Errorf("OIDC is required in production")
	}
	for name, v := range map[string]string{"S3_ENDPOINT": c.S3Endpoint, "OIDC_ISSUER": c.OIDCIssuer} {
		if v == "" {
			continue
		}
		u, err := url.Parse(v)
		if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
			return c, fmt.Errorf("invalid %s URL", name)
		}
		if name == "OIDC_ISSUER" && c.Env == "production" && u.Scheme != "https" {
			return c, fmt.Errorf("production OIDC requires HTTPS")
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
