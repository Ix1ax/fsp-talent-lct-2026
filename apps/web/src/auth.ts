import Keycloak from 'keycloak-js'
import { API_BASE_URL } from './api'

let initialization: Promise<Keycloak> | undefined

// Единственная инициализация на вкладку; access/refresh токены остаются в памяти.
export function initializeAuth(): Promise<Keycloak> {
  if (!initialization) {
    initialization = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/config`)
      if (!response.ok) throw new Error('Keycloak недоступен')
      const config = await response.json() as { issuer: string; client_id: string }
      const separator = config.issuer.lastIndexOf('/realms/')
      if (separator < 0) throw new Error('Некорректная конфигурация авторизации')
      const client = new Keycloak({
        url: config.issuer.slice(0, separator),
        realm: config.issuer.slice(separator + '/realms/'.length),
        clientId: config.client_id,
      })
      try {
        await client.init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false })
      } catch {
        throw new Error('Не удалось подключиться к сервису авторизации')
      }
      return client
    })().catch(() => {
      initialization = undefined
      throw new Error('Не удалось настроить вход. Проверьте доступность API и Keycloak.')
    })
  }
  return initialization
}
