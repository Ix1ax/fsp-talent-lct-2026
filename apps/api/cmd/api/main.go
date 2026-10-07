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

	adminrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	admincatalogrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/repository"
	admincatalogservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/service"
	assessmentrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	assessmentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	candidaterepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	bankrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	bankservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/config"
	consentrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/repository"
	consentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	offerrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/repository"
	offerservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
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
	candidateRepo := candidaterepository.NewRepository(deps.DB)
	srv := &http.Server{
		Addr: c.Addr,
		Handler: httpapi.New(log, deps, verifier, httpapi.Options{
			Admins:             adminservice.New(adminrepository.New(deps.DB)),
			AdminCatalogs:      admincatalogservice.New(admincatalogrepo.New(deps.DB)),
			Assessments:        assessmentservice.New(assessmentrepository.New(deps.DB)),
			AssessmentAttempts: assessmentservice.NewAttempts(assessmentrepository.New(deps.DB), c.AssessmentRetakeDays),
			CORSOrigins:        c.CORSOrigins,
			OIDCIssuer:         c.OIDCIssuer,
			Users:              user.NewService(user.NewRepository(deps.DB)),
			Companies:          service.NewCompanyService(companyRepo),
			Candidates:         candidateservice.NewProfileService(candidateRepo),
			CandidateContacts:  candidateservice.NewContactsService(candidateRepo),
			CandidateSkills:    candidateservice.NewSkillsService(candidateRepo),
			CandidateFull:      candidateservice.NewFullProfileService(candidateRepo, c.PrivacyPolicyVersion),
			CandidateCareer:    candidateservice.NewCareerService(candidateRepo, time.Now),
			CandidateResume:    candidateservice.NewResumeImportService(candidateRepo, time.Now),
			Avatars:            candidateservice.NewAvatarService(candidateRepo, files.NewS3(deps.Objects), deps.Bucket, log),
			Documents:          service.NewDocumentService(companyRepo, files.NewS3(deps.Objects), deps.Bucket, log),
			Needs:              service.NewNeedsService(companyRepo),
			Members:            service.NewMemberService(companyRepo),
			Catalogs:           catalog.NewService(catalog.NewRepository(deps.DB)),
			Offers:             offerservice.New(offerrepository.New(deps.DB)),
			CandidateBank:      bankservice.New(bankrepository.New(deps.DB)),
			Consents:           consentservice.NewService(consentrepository.NewRepository(deps.DB), c.PrivacyPolicyVersion),
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
