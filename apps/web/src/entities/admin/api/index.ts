export {
  invalidateAdminCatalogs,
  setAdminCatalogSession,
  subscribeAdminCatalogs,
} from './catalogCache';
import { z } from 'zod';

export {
  createAdminCatalogItem,
  deleteAdminCatalogItem,
  getAdminCatalogs,
  getAdminSkill,
  loadAdminCatalog,
  updateAdminCatalogItem,
} from './catalogs';
export {
  deleteAdminPreview,
  getAdminPreview,
  saveAdminPreviewAnswer,
  startAdminPreview,
  submitAdminPreview,
} from './previews';

import {
  accountSchema,
  catalogSchema,
  loginSchema,
  pageSchema,
  questionSchema,
  shortageSchema,
  templateSchema,
  versionSchema,
} from '../model';

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null = null,
    readonly retryAfter: string | null = null,
    readonly shortages: z.infer<typeof shortageSchema>[] = [],
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
const ADMIN_LOGOUT_TIMEOUT_MS = 5_000;

export type AdminRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};
export const adminRequest = async <T>(
  token: string | null,
  path: string,
  schema: z.ZodType<T>,
  options: AdminRequestOptions = {},
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
      const text = response.status === 204 ? '' : await response.text();
      return { response, text };
    };
    const { response, text } = await Promise.race([read(), aborted]).catch(
      transportError,
    );
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
    const parsed = schema.safeParse(data);
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
export const adminLogin = (email: string, password: string) =>
  adminRequest(null, '/auth/login', loginSchema, {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  });
export const adminMe = (token: string, signal?: AbortSignal) =>
  adminRequest(token, '/auth/me', accountSchema, { signal });
export const adminLogout = (token: string) =>
  adminRequest(token, '/auth/logout', z.undefined(), {
    method: 'POST',
    timeoutMs: ADMIN_LOGOUT_TIMEOUT_MS,
  });
export const adminSchemas = {
  accounts: pageSchema(accountSchema),
  catalogs: pageSchema(catalogSchema),
  questions: pageSchema(questionSchema),
  templates: pageSchema(templateSchema),
  catalog: catalogSchema,
  question: questionSchema,
  template: templateSchema,
  account: accountSchema,
  version: versionSchema,
};
export const moderationSchema = z.object({
  skill: catalogSchema,
  candidate_links: z.number(),
  need_links: z.number(),
  drafted_needs: z.number(),
});
export const queryString = (
  params: Record<string, string | number | undefined>,
) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== '') query.set(key, String(value));
  return query.toString();
};
