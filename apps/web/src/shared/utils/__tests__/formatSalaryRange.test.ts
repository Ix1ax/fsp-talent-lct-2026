import { describe, expect, it } from 'vitest';

import { formatSalaryRange } from '../formatSalaryRange';

describe('Форматирование зарплатной вилки', () => {
  it('различает отсутствие значения, ноль и одностороннюю границу', () => {
    expect(formatSalaryRange(null, null)).toBe('Вилка не указана');
    expect(formatSalaryRange(0, null)).toBe('от 0 ₽/мес');
    expect(formatSalaryRange(null, 0)).toBe('до 0 ₽/мес');
    expect(formatSalaryRange(180000, 240000, true)).toBe('180K–240K');
  });
});
