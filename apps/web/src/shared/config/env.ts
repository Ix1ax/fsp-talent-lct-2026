export function getApiProxyTarget(): string {
  return process.env.API_PROXY_TARGET ?? 'http://localhost:8080'
}
