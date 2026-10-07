import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { AssessmentResult } from '@/entities/assessment';

import { AssessmentResultCard } from '../AssessmentResultCard';

vi.mock('../../model', () => ({
  useAssessmentResultSync: () => ({ syncError: '', retrySync: vi.fn() }),
}));
const result: AssessmentResult = {
  passed: true,
  scorePercent: 90,
  passScore: 70,
  skills: [
    { skillId: 'go', name: 'Go', percent: 90, confirmed: true, level: 3 },
  ],
  category: {
    specializationId: 1,
    specialization: 'Бэкенд',
    gradeId: 2,
    grade: 'Junior',
    confirmedAt: '2026-10-07T12:00:00Z',
  },
  retryAt: null,
};
describe('assessment result', () => {
  it('shows the server score, category and verified skill level', () => {
    const html = renderToStaticMarkup(
      createElement(AssessmentResultCard, { result }),
    );
    expect(html).toContain('Тест пройден');
    expect(html).toContain('90');
    expect(html).toContain('Бэкенд');
    expect(html).toContain('Junior');
    expect(html).toContain('3/5');
  });
  it('shows failed confirmation and a server retry date', () => {
    const html = renderToStaticMarkup(
      createElement(AssessmentResultCard, {
        result: {
          ...result,
          passed: false,
          category: null,
          retryAt: '2026-10-14T12:00:00Z',
          skills: [{ ...result.skills[0], confirmed: false }],
        },
      }),
    );
    expect(html).toContain('Тест не пройден');
    expect(html).toContain('Не подтверждён');
    expect(html).toContain('Пересдача доступна');
    expect(html).not.toContain('Подтверждённая категория');
  });
});
