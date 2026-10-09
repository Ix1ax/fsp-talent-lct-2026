// sync-user-identities заполняет сведения существующих аккаунтов из административной выгрузки Keycloak.
package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"
)

func run() error {
	issuer := flag.String("issuer", os.Getenv("OIDC_ISSUER"), "Точный issuer зарегистрированных пользователей")
	file := flag.String("file", "-", "JSON-выгрузка Keycloak; - читает stdin")
	date := flag.String("observed-at", time.Now().UTC().Format(time.RFC3339Nano), "Время создания выгрузки RFC3339")
	flag.Parse()
	if os.Getenv("DATABASE_URL") == "" {
		return fmt.Errorf("Необходимо указать DATABASE_URL")
	}
	observedAt, err := time.Parse(time.RFC3339Nano, *date)
	if err != nil {
		return fmt.Errorf("Некорректный observed-at")
	}
	var input io.Reader = os.Stdin
	if *file != "-" {
		f, err := os.Open(*file)
		if err != nil {
			return fmt.Errorf("Не удалось открыть выгрузку")
		}
		defer f.Close()
		input = f
	}
	records, err := user.DecodeIdentityImport(input)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	db, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("Не удалось подключиться к базе")
	}
	defer db.Close()
	result, err := user.NewRepository(db).ImportIdentityProfiles(ctx, *issuer, records, observedAt)
	if err != nil {
		return fmt.Errorf("Импорт не выполнен; изменения отменены")
	}
	fmt.Printf("Обновлено: %d; пропущено: %d\n", result.Updated, result.Skipped)
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
