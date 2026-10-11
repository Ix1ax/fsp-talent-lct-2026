export const adminDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    : 'Не указано';
export const adminNumber = (value: number) => value.toLocaleString('ru-RU');
export const adminSalary = (from: number | null, to: number | null) => {
  if (from === null && to === null) return 'Не указана';
  if (from === to) return `${adminNumber(from!)} ₽ / мес.`;
  if (from === null) return `до ${adminNumber(to!)} ₽ / мес.`;
  if (to === null) return `от ${adminNumber(from)} ₽ / мес.`;
  return `${adminNumber(from)}–${adminNumber(to)} ₽ / мес.`;
};
