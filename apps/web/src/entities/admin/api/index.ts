import { z } from 'zod';

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
export type AdminRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
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
  const transportError = (error: unknown): never => {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    const mutation =
      options.method && options.method !== 'GET' && path !== '/auth/login';
    throw new AdminApiError(
      mutation
        ? 'Ответ сервера не получен. Перед повтором проверьте список: изменение могло сохраниться.'
        : 'Не удалось связаться с сервером. Проверьте подключение.',
      0,
      'network',
    );
  };
  const response = await fetch(`/api/v1/admin${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'omit',
    cache: 'no-store',
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }).catch(transportError);
  const text =
    response.status === 204 ? '' : await response.text().catch(transportError);
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
  if (!parsed.success) throw new Error('API вернул неожиданный формат ответа');
  return parsed.data;
};
export const adminLogin = (email: string, password: string) =>
  adminRequest(null, '/auth/login', loginSchema, {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  });
export const adminMe = (token: string, signal?: AbortSignal) =>
  adminRequest(token, '/auth/me', accountSchema, { signal });
export const adminLogout = (token: string) =>
  adminRequest(token, '/auth/logout', z.undefined(), { method: 'POST' });
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
