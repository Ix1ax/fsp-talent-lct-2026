package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	adminrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/demoseed"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/migrations"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("Необходимо указать DATABASE_URL")
	}
	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}
	if command != "up" && command != "status" && command != "down" {
		log.Fatal("Укажите команду up, status или down")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatal("Некорректные настройки подключения к базе данных")
	}
	defer db.Close()
	goose.SetBaseFS(migrations.Files)
	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatal("Не удалось выполнить миграции: ", err)
	}
	if err := goose.Run(command, db, "."); err != nil {
		log.Fatal("Не удалось выполнить миграции: ", err)
	}
	if command == "up" && (os.Getenv("ADMIN_BOOTSTRAP_EMAIL") != "" || os.Getenv("ADMIN_BOOTSTRAP_PASSWORD") != "") {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		pool, err := pgxpool.New(ctx, dsn)
		if err != nil {
			log.Fatal("Не удалось подключиться для настройки суперадмина")
		}
		defer pool.Close()
		if err = adminservice.New(adminrepository.New(pool)).Bootstrap(ctx, os.Getenv("ADMIN_BOOTSTRAP_EMAIL"), os.Getenv("ADMIN_BOOTSTRAP_PASSWORD")); err != nil {
			log.Fatal("Не удалось настроить суперадмина: ", err)
		}
	}
	if command == "up" {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
		defer cancel()
		if err := demoseed.Apply(ctx, db); err != nil {
			log.Fatal("Не удалось подготовить демо-набор: ", err)
		}
		log.Print("Демонстрационные аккаунты, данные и файлы готовы")
	}
}
