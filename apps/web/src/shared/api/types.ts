/** Ответ API со страницей записей. total отсутствует у некоторых списков. */
export interface Page<T> {
  items: T[];
  limit: number;
  offset: number;
}
