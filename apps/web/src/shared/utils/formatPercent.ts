/** Процент по-русски: formatPercent(3.571) → «3,57%». */
export const formatPercent = (value: number): string =>
  `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`;
