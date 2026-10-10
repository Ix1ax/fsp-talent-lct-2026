import { describe, expect, it } from 'vitest';

import type { AvailableAssessment } from '@/entities/assessment';
import type { Catalogs, Skill } from '@/entities/catalog';

import { getAssessmentTitle } from '../assessmentMessages';

const test: AvailableAssessment = {
  stackSkillId: 'go-id',
  specializationId: 1,
  gradeId: 2,
  timeLimitSec: 600,
  passScore: 70,
  questionCount: 10,
  canStart: true,
  reason: 'ok',
  retryAt: null,
  confirmed: false,
};

const catalogs: Catalogs = {
  specializations: [{ id: 1, code: 'backend', name: 'Бэкенд' }],
  grades: [{ id: 2, code: 'junior', name: 'Junior', rank: 1 }],
  workFormats: [],
};

const skills: Skill[] = [
  { id: 'go-id', code: 'go', name: 'Go', aliases: [] },
  { id: 'java-id', code: 'java', name: 'Java', aliases: [] },
];

describe('getAssessmentTitle', () => {
  it('distinguishes languages with the same specialization and grade', () => {
    expect(getAssessmentTitle(test, catalogs, skills)).toBe(
      'Go · Бэкенд · Junior',
    );
    expect(
      getAssessmentTitle(
        { ...test, stackSkillId: 'java-id' },
        catalogs,
        skills,
      ),
    ).toBe('Java · Бэкенд · Junior');
  });

  it('keeps tests distinguishable when catalogs are unavailable', () => {
    expect(getAssessmentTitle(test)).toBe(
      'Стек №go-id · Специализация №1 · Грейд №2',
    );
    expect(getAssessmentTitle(test, undefined, skills)).toBe(
      'Go · Специализация №1 · Грейд №2',
    );
  });

  it('does not assign another language to a missing skill', () => {
    expect(
      getAssessmentTitle(
        { ...test, stackSkillId: 'unknown' },
        catalogs,
        skills,
      ),
    ).toBe('Стек №unknown · Бэкенд · Junior');
  });
});
