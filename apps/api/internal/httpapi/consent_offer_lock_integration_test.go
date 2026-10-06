//go:build integration

package httpapi

import (
	"context"
	"testing"
	"time"
)

// Отзыв согласия блокирует пользователя FOR UPDATE и затем обновляет профиль. Запросы офферов, которые берут
// профиль раньше пользователя, давали взаимную блокировку (SQLSTATE 40P01). Тест имитирует первые шаги отзыва
// и запускает реальный запрос оффера: если порядок блокировок неверный, обновление профиля или запрос падает.
func TestOfferQueriesDoNotDeadlockWithRevoke(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	candidateUser := f.ids["candidate"]
	offer := f.create(t)
	cases := []struct {
		name string
		run  func() int
	}{
		{"создание предложения", func() int { return f.auth.do(t, "POST", f.base(), f.tokens["recruiter"], f.body()).Code }},
		{"список предложений кандидата", func() int { return f.auth.do(t, "GET", "/api/v1/me/offers", f.tokens["candidate"], "").Code }},
		{"просмотр предложения", func() int {
			return f.auth.do(t, "POST", "/api/v1/me/offers/"+offer.ID+"/view", f.tokens["candidate"], "").Code
		}},
	}
	for _, tc := range cases {
		f.exec(t, `UPDATE candidate_profiles SET search_status='open' WHERE user_id=$1`, candidateUser)
		tx, err := f.db.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		var locked bool
		if err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 FOR UPDATE`, candidateUser).Scan(&locked); err != nil {
			t.Fatal(err)
		}
		done := make(chan int, 1)
		go func() { done <- tc.run() }()
		time.Sleep(400 * time.Millisecond) // запрос оффера успевает дойти до ожидания блокировки
		update, cancel := context.WithTimeout(ctx, 8*time.Second)
		_, err = tx.Exec(update, `UPDATE candidate_profiles SET search_status='hidden' WHERE user_id=$1`, candidateUser)
		cancel()
		if err != nil {
			_ = tx.Rollback(ctx)
			<-done
			t.Fatalf("%s: отзыв и запрос оффера заблокировали друг друга: %v", tc.name, err)
		}
		if err = tx.Commit(ctx); err != nil {
			t.Fatal(err)
		}
		select {
		case code := <-done:
			if code == 500 {
				t.Fatalf("%s: запрос оффера завершился ошибкой 500 (взаимная блокировка)", tc.name)
			}
		case <-time.After(10 * time.Second):
			t.Fatalf("%s: запрос оффера завис", tc.name)
		}
	}
}
