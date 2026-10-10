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

  const suffix = compact ? '' : ' ₽/мес';
  if (from === null) return `до ${fmt(to!)}${suffix}`;
  if (to === null) return `от ${fmt(from)}${suffix}`;

  return `${fmt(from)}–${fmt(to)}${suffix}`;
};
