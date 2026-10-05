package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

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
}
