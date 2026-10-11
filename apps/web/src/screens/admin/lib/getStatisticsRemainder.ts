export const getStatisticsRemainder = (total: number, ...values: number[]) =>
  Math.max(0, total - values.reduce((sum, value) => sum + value, 0));
