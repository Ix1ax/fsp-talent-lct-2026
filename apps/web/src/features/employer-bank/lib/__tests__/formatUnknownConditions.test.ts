import { describe, expect, it } from 'vitest';

import { formatUnknownConditions } from '../formatUnknownConditions';

const labels = { city: 'Город', timezone: 'Часовой пояс' };

describe('formatUnknownConditions', () => {
  it('shows skill names instead of raw skill ids', () => {
    expect(
      formatUnknownConditions(
        ['city', 'timezone', 'skill:s1', 'skill:s2'],
        labels,
        [
          { id: 's1', name: 'Go' },
          { id: 's2', name: 'PostgreSQL' },
        ],
      ),
    ).toBe('город, часовой пояс, навыки: Go, PostgreSQL');
  });

  it('never leaks an id when the skill name is unknown', () => {
    expect(formatUnknownConditions(['skill:x'], labels)).toBe('часть навыков');
  });
});
