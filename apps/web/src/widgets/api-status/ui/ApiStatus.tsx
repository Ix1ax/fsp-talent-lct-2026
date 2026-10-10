import { getAPIInfo } from '@/shared/api/info';

export const ApiStatus = async () => {
  let status = 'API недоступен. Проверьте запуск бекенда.';

  try {
    const info = await getAPIInfo();
    status = `${info.name} · v${info.version} · доступен`;
  } catch {
    status = 'API недоступен. Проверьте запуск бекенда.';
  }

  return (
    <p
      className="inline-block rounded-md border border-border px-3.5 py-2 font-mono text-[13px] text-foreground"
      role="status"
    >
      {status}
    </p>
  );
};
