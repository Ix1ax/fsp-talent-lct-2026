import { describe, expect, it } from 'vitest';

import { formatFileSize } from '../formatFileSize';

describe('formatFileSize', () => {
  it('formats bytes, kilobytes and megabytes in Russian', () => {
    expect(formatFileSize(300)).toBe('300 Б');
    expect(formatFileSize(1100)).toBe('1 КБ');
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe('2,4 МБ');
  });
});
