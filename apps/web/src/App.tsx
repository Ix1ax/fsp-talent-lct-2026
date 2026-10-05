import { useEffect, useState } from 'react'
import { getAPIInfo } from './api'

export default function App() {
  const [status, setStatus] = useState('Подключение…')

  useEffect(() => {
    const controller = new AbortController()
    getAPIInfo(controller.signal)
      .then(info => setStatus(`${info.name} · v${info.version} · доступен`))
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus('API недоступен. Проверьте запуск бекенда.')
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <main>
      <header>
        <span className="mark">ФСП</span>
        <span>ЛЦТ 2026 / Командная разработка</span>
      </header>
      <section>
        <p className="eyebrow">DEVELOPMENT WORKSPACE</p>
        <h1>Основа готова.<br />Дальше — ваш код.</h1>
        <p className="intro">
          Стартовая страница монорепозитория. Здесь можно проверить,
          что фронтенд видит API.
        </p>
        <p className="status" role="status">{status}</p>
      </section>
      <div className="grid">
        <article>
          <span>APPS / API</span>
          <h2>Go + Gin</h2>
          <p>Postgres, Redis, S3 и миграции.</p>
        </article>
        <article>
          <span>APPS / WEB</span>
          <h2>React + Vite</h2>
          <p>TypeScript и общий API-контракт.</p>
        </article>
      </div>
      <footer>Технический бойлерплейт · продуктовые сценарии ещё не реализованы</footer>
    </main>
  )
}
