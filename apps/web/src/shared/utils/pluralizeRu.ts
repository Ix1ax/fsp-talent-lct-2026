/** Русское склонение по числу: pluralizeRu(3, ['навык', 'навыка', 'навыков']) → «3 навыка». */
export const pluralizeRu = (
  count: number,
  [one, few, many]: readonly [string, string, string],
): string => {
  if (!Number.isInteger(count))
    return `${count.toLocaleString('ru-RU')} ${few}`;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${count} ${few}`;
  return `${count} ${many}`;
};
