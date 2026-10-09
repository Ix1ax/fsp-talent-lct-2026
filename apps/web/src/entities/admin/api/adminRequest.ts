import { z } from 'zod';

import type { Shortage } from '../model';
import { shortageSchema } from './schemas';

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null = null,
    readonly retryAfter: string | null = null,
    readonly shortages: Shortage[] = [],
  ) {
    super(message);
  }
}
const errorSchema = z.object({
  error: z
    .object({ code: z.string().optional(), message: z.string().optional() })
    .optional(),
  shortages: z.array(shortageSchema).optional(),
});
export const ADMIN_REQUEST_TIMEOUT_MS = 30_000;

export type AdminRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};
const request = async <T>(
  token: string | null,
  path: string,
  schema: z.ZodType<T>,
  options: AdminRequestOptions = {},
  binary = false,
): Promise<T> => {
  const headers = new Headers({
    Accept: 'application/json',
    ...options.headers,
  });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined)
    headers.set('Content-Type', 'application/json');
  const controller = new AbortController();
  let receivedResponse: Response | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const mutation =
    options.method && options.method !== 'GET' && path !== '/auth/login';
  const transportError = (error: unknown): never => {
    if (controller.signal.aborted && !timedOut) throw controller.signal.reason;
    if (!timedOut && error instanceof Error && error.name === 'AbortError')
      throw error;
    let message = 'Не удалось связаться с сервером. Проверьте подключение.';
    if (timedOut) message = 'Сервер не ответил вовремя. Попробуйте ещё раз.';
    if (mutation)
      message =
        'Ответ сервера не получен. Перед повтором проверьте данные: изменение могло сохраниться.';
    throw new AdminApiError(
      message,
      0,
      timedOut ? 'timeout' : 'network',
      receivedResponse?.headers.get('X-Request-ID') ?? null,
      receivedResponse?.headers.get('Retry-After') ?? null,
    );
  };
  const cancel = () => controller.abort(options.signal?.reason);
  let rejectAbort: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => rejectAbort(controller.signal.reason);
  controller.signal.addEventListener('abort', onAbort, { once: true });
  options.signal?.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();
  else
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, options.timeoutMs ?? ADMIN_REQUEST_TIMEOUT_MS);

  try {
    // The same deadline covers headers and the complete response body.
    const read = async () => {
      controller.signal.throwIfAborted();
      const response = await fetch(`/api/v1/admin${path}`, {
        method: options.method ?? 'GET',
        headers,
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      receivedResponse = response;
      if (binary && response.ok)
        return { response, text: '', blob: await response.blob() };
      const text = response.status === 204 ? '' : await response.text();
      return { response, text, blob: undefined };
    };
    const { response, text, blob } = await Promise.race([
      read(),
      aborted,
    ]).catch(transportError);
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(data);
      const payload = parsed.success ? parsed.data : undefined;
      if (response.status === 401 && token)
        window.dispatchEvent(new Event('admin:expired'));
      throw new AdminApiError(
        payload?.error?.message ?? `Ошибка HTTP ${response.status}`,
        response.status,
        payload?.error?.code ?? 'http_error',
        response.headers.get('X-Request-ID'),
        response.headers.get('Retry-After'),
        payload?.shortages ?? [],
      );
    }
    const parsed = schema.safeParse(binary ? blob : data);
    if (!parsed.success) {
      let message = 'API вернул неожиданный формат ответа';
      if (mutation)
        message +=
          '. Перед повтором проверьте данные: изменение могло сохраниться.';
      throw new Error(message);
    }
    return parsed.data;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort);
  }
};

export const adminRequest = <T>(
  token: string | null,
  path: string,
  schema: z.ZodType<T>,
  options: AdminRequestOptions = {},
) => request(token, path, schema, options);

export const adminDownloadFile = (
  token: string,
  path: string,
  signal?: AbortSignal,
) => request(token, path, z.instanceof(Blob), { signal }, true);
