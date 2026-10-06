package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/config"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/platform"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("API остановлен из-за ошибки", "error", err)
		os.Exit(1)
	}
}
func run(log *slog.Logger) error {
	c, err := config.Load()
	if err != nil {
		return err
	}
	gin.SetMode(gin.ReleaseMode)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	startup, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	deps, err := platform.Open(startup, c)
	if err != nil {
		return err
	}
	defer deps.Close()
	var verifier auth.Verifier
	if c.OIDCIssuer != "" {
		configured, err := auth.NewVerifier(startup, c.OIDCIssuer, c.OIDCClientID, c.OIDCInternalURL)
		if err != nil {
			return errors.New("Не удалось получить настройки сервиса авторизации")
		}
		verifier = configured
	}
	companyRepo := repository.NewRepository(deps.DB)
	srv := &http.Server{
		Addr: c.Addr,
		Handler: httpapi.New(log, deps, verifier, httpapi.Options{
			CORSOrigins: c.CORSOrigins,
			OIDCIssuer:  c.OIDCIssuer,
			Users:       user.NewService(user.NewRepository(deps.DB)),
			Companies:   service.NewCompanyService(companyRepo),
			Documents:   service.NewDocumentService(companyRepo, files.NewS3(deps.Objects), deps.Bucket, log),
			Needs:       service.NewNeedsService(companyRepo),
			Catalogs:    catalog.NewService(catalog.NewRepository(deps.DB)),
		}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	failed := make(chan error, 1)
	go func() {
		log.Info("API принимает запросы", "address", c.Addr)
		failed <- srv.ListenAndServe()
	}()
	select {
	case err := <-failed:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
	}
	shutdown, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()
	return srv.Shutdown(shutdown)
}
