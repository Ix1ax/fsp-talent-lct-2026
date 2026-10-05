import { useEffect, useState } from 'react'
import { API_BASE_URL, getAPIInfo, getIdentity } from './api'
import { initializeAuth } from './auth'

export default function App() {
  const [authStatus, setAuthStatus] = useState('Вход ещё не выполнен')
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

  async function login() {
    try {
      const client = await initializeAuth()
      if (!client.authenticated) {
        await client.login({ redirectUri: window.location.origin })
        return
      }
      await client.updateToken(30)
      const identity = await getIdentity(client.token ?? '')
      setAuthStatus(`Токен принят API: ${identity.email}`)
    } catch {
      setAuthStatus('Не удалось войти или проверить токен. Проверьте доступность API и настройки Keycloak.')
    }
  }

  async function logout() {
    try {
      const client = await initializeAuth()
      await client.logout({ redirectUri: window.location.origin })
    } catch {
      setAuthStatus('Не удалось выйти. Проверьте доступность сервиса авторизации.')
    }
  }

  return (
    <main>
      <header>
        <span className="mark">ФСП</span>
        <span>ЛЦТ 2026 / Командная разработка</span>
      </header>
      <section>
        <p className="eyebrow">СРЕДА РАЗРАБОТКИ</p>
        <h1>Основа готова.<br />Дальше — ваш код.</h1>
        <p className="intro">
          Стартовая страница монорепозитория. Здесь можно проверить,
          что фронтенд видит API.
        </p>
        <p className="status" role="status">{status}</p>
      </section>
      <div className="grid">
        <article>
          <span>БЕКЕНД / API</span>
          <h2>Go + Gin</h2>
          <p>Postgres, Redis, S3 и миграции.</p>
        </article>
        <article>
          <span>ФРОНТЕНД / WEB</span>
          <h2>React + Vite</h2>
          <p>TypeScript и общий API-контракт.</p>
        </article>
      </div>
      <section className="auth-panel">
        <h2>Проверка авторизации</h2>
        <p role="status">{authStatus}</p>
        <button onClick={() => { void login() }}>Войти / проверить токен</button>{' '}
        <button onClick={() => { void logout() }}>Выйти</button>{' '}
        <a href={`${API_BASE_URL}/docs/`} target="_blank" rel="noreferrer">Swagger API</a>
      </section>
      <footer>Технический бойлерплейт · продуктовые сценарии ещё не реализованы</footer>
    </main>
  )
}
