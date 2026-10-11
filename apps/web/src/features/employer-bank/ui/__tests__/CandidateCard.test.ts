import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { BankCandidate } from '@/entities/employer-bank';

import { CandidateCard } from '../CandidateCard';

const candidate: BankCandidate = {
  id: 'profile-id',
  city: null,
  timezone: null,
  experienceMonths: 30,
  salaryMinRub: null,
  searchStatus: 'open',
  workFormatIds: [],
  category: null,
  declaredCategory: {
    specializationId: 1,
    gradeId: 2,
    stackSkillId: null,
    stackName: 'React',
  },
  gradeStatus: 'unconfirmed',
  achievementsCount: 0,
  fspBonus: 0,
};
const render = (value = candidate) =>
  renderToString(
    createElement(CandidateCard, {
      candidate: value,
      catalogs: {
        specializations: [{ id: 1, code: 'frontend', name: 'Frontend' }],
        grades: [{ id: 2, code: 'middle', name: 'Middle', rank: 2 }],
        workFormats: [],
      },
      onOpen: vi.fn(),
    }),
  ).replace(/<!--.*?-->/g, '');
describe('anonymous candidate presentation', () => {
  it('labels self-assessment, missing salary and months converted to years', () => {
    const html = render();
    expect(html).toContain('самооценка');
    expect(html).toContain('Зарплата не указана');
    expect(html).toContain('2,5 года');
    expect(html).not.toContain('0%');
  });
  it.each([
    [12, '1 год'],
    [36, '3 года'],
    [60, '5 лет'],
    [132, '11 лет'],
  ])('declines experience for %i months', (experienceMonths, expected) => {
    expect(render({ ...candidate, experienceMonths })).toContain(expected);
  });
  it('distinguishes confirmed qualification and zero salary from missing data', () => {
    const html = render({
      ...candidate,
      category: candidate.declaredCategory,
      gradeStatus: 'confirmed',
      salaryMinRub: 0,
    });
    expect(html).toContain('Грейд подтверждён тестом');
    expect(html).toContain('От 0 ₽/мес');
    expect(html).not.toContain('самооценка');
  });
});
