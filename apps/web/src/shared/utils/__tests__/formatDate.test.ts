import { describe, expect, it } from 'vitest';

import { formatCalendarDate, formatMonthYear } from '../formatDate';

describe('calendar dates in candidate profiles', () => {
  it('keeps a calendar day without adding a time or moving it to yesterday', () => {
    expect(formatCalendarDate('2026-10-08')).toBe('08.10.2026');
    expect(formatCalendarDate('2026-10-08T00:00:00Z')).toBe('08.10.2026');
  });
  it('shows month precision for experience', () => {
    expect(formatMonthYear('2022-03')).toContain('март 2022');
  });
  it('handles invalid dates', () => {
    expect(formatMonthYear('invalid')).toBe('Дата не указана');
    expect(formatCalendarDate('invalid')).toBe('Дата не указана');
  });
});
