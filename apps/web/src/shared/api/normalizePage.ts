import type { Page } from './types';

/** API без total: запрашиваем limit + 1, но показываем только limit записей. */
export const normalizePage = <T>(page: Page<T>, limit = 20): Page<T> => ({
  ...page,
  items: page.items.slice(0, limit),
  limit,
  hasMore: page.items.length > limit,
});
