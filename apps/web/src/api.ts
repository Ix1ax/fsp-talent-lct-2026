export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
export type APIInfo = { name: string; version: string }
export type Identity = { sub: string; email: string; email_verified: boolean }

export async function getAPIInfo(signal?: AbortSignal): Promise<APIInfo> {
  const response = await fetch(`${API_BASE_URL}/api/v1/info`, { signal })
  if (!response.ok) throw new Error(`Ошибка API: HTTP ${response.status}`)
  return response.json() as Promise<APIInfo>
}

export async function getIdentity(token: string): Promise<Identity> {
  const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Ошибка API: HTTP ${response.status}`)
  return response.json() as Promise<Identity>
}
