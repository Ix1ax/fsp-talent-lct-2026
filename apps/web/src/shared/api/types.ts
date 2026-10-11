/** Нормализованная страница: hasMore учитывает дополнительную запись API. */
export type Page<T> = {
  items: T[];
  limit: number;
  offset: number;
  hasMore?: boolean;
};
