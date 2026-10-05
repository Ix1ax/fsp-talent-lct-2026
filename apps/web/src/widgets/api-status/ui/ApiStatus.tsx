import { getAPIInfo } from '@/shared/api'

export async function ApiStatus() {
  let status = 'API недоступен. Проверьте запуск бекенда.'

  try {
    const info = await getAPIInfo()
    status = `${info.name} · v${info.version} · доступен`
  } catch {
    // keep fallback message
  }

  return (
    <p className="status" role="status">
      {status}
    </p>
  )
}
