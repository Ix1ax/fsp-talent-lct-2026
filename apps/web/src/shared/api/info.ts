import { getApiProxyTarget } from '@/shared/config'

export type APIInfo = { name: string; version: string }

export async function getAPIInfo(signal?: AbortSignal): Promise<APIInfo> {
  const base = getApiProxyTarget()
  const response = await fetch(`${base}/api/v1/info`, {
    signal,
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`API: HTTP ${response.status}`)
  return response.json() as Promise<APIInfo>
}
