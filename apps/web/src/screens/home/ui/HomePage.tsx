import { ApiStatus } from '@/widgets/api-status'

export function HomePage() {
  return (
    <main>
      <header>
        <span className="mark">ФСП</span>
        <span>ЛЦТ 2026 / Командная разработка</span>
      </header>
      <section>
        <p className="eyebrow">DEVELOPMENT WORKSPACE</p>
        <h1>
          Основа готова.
          <br />
          Дальше — ваш код.
        </h1>
        <p className="intro">
          Стартовая страница монорепозитория. Здесь можно проверить, что фронтенд
          видит API.
        </p>
        <ApiStatus />
      </section>
      <div className="grid">
        <article>
          <span>APPS / API</span>
          <h2>Go + Gin</h2>
          <p>Postgres, Redis, S3 и миграции.</p>
        </article>
        <article>
          <span>APPS / WEB</span>
          <h2>Next.js + FSD</h2>
          <p>App Router, TypeScript и общий API-контракт.</p>
        </article>
      </div>
      <footer>Технический бойлерплейт · продуктовые сценарии ещё не реализованы</footer>
    </main>
  )
}
