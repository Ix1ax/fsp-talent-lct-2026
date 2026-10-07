export const formatDate = (value: string): string =>
  new Date(value).toLocaleString('ru-RU');
