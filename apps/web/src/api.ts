export type APIInfo = { name: string; version: string }
export async function getAPIInfo(signal?: AbortSignal): Promise<APIInfo> {
  const response = await fetch('/api/v1/info', { signal })
  if (!response.ok) throw new Error(`API: HTTP ${response.status}`)
  return response.json() as Promise<APIInfo>
}
