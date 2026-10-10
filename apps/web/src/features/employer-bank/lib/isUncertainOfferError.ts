import { ApiError } from '@/shared/api/errors';

export const isUncertainOfferError = (error: unknown) =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500);
