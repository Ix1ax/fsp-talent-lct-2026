export const formatSalaryRange = (
  from: number | null,
  to: number | null,
  compact = false,
) => {
  if (from === null && to === null) return 'Вилка не указана';

  const fmt = (n: number) =>
    compact && n >= 1000
      ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n / 1000)}K`
      : new Intl.NumberFormat('ru-RU').format(n);

  return `${from === null ? 'до ' : to === null ? 'от ' : ''}${from === null ? fmt(to!) : to === null ? fmt(from) : `${fmt(from)}–${fmt(to)}`}${compact ? '' : ' ₽/мес'}`;
};
