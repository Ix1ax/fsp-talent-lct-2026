import { convertSnakeToCamel } from '@/shared/utils';

type BackendErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly data?: unknown;

  constructor(
    status: number,
    message: string,
    code = 'unknown',
    data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export const toApiError = (
  status: number,
  data: unknown,
  fallback: string,
): ApiError => {
  const normalized = data !== undefined ? convertSnakeToCamel(data) : undefined;
  const body = normalized as BackendErrorBody | undefined;
  const message = body?.error?.message ?? body?.message ?? fallback;
  const code = body?.error?.code ?? 'unknown';

  return new ApiError(status, message, code, normalized);
};
