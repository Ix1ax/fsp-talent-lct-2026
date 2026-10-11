export const formatDate = (value: string): string =>
  new Date(value).toLocaleString('ru-RU');

/** Calendar values must not shift when the browser is west of UTC. */
export const formatCalendarDate = (value: string): string => {
  const date = new Date(value.slice(0, 10));
  return Number.isNaN(date.getTime())
    ? 'Дата не указана'
    : date.toLocaleDateString('ru-RU', { timeZone: 'UTC' });
};

export const formatMonthYear = (value: string): string => {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? 'Дата не указана'
    : date.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
};
