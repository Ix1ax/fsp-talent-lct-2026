import { describe, expect, it } from 'vitest';

import type { EmployerNeed } from '@/entities/employer-need';

import {
  changedNeedFields,
  emptyNeed,
  toNeedInput,
  validateNeed,
} from '../needForm';
const draft = () => ({
  ...emptyNeed(),
  title: 'Frontend',
  description: 'Развитие продукта',
  specializationId: 1,
});
describe('Правила потребности', () => {
  it('допускает 50 навыков и отклоняет 51 для черновика и активной потребности', () => {
    const skills = Array.from({ length: 51 }, (_, index) => ({
      skillId: `skill-${index}`,
      required: index % 2 === 0,
      weight: 1,
    }));
    for (const status of ['draft', 'active'] as const) {
      const input = { ...draft(), workFormatIds: [1] };
      expect(
        validateNeed({ ...input, skills: skills.slice(0, 50) }, status),
      ).toEqual({});
      expect(validateNeed({ ...input, skills }, status).skills).toBeTruthy();
    }
  });
  it.each(['+03:00', '-04:00', 'Local', 'wrong/timezone'])(
    'отклоняет пояс %s',
    (timezone) => {
      expect(
        validateNeed({ ...draft(), timezone }, 'draft').timezone,
      ).toBeTruthy();
    },
  );
  it.each(['Europe/Moscow', 'UTC', 'Etc/UTC', null])(
    'допускает пояс %s',
    (timezone) => {
      expect(validateNeed({ ...draft(), timezone }, 'draft')).toEqual({});
    },
  );
  it('сохраняет минимальный черновик без вилки и грейда', () => {
    expect(validateNeed(draft(), 'draft')).toEqual({});
  });
  it('требует навык и формат только при активации', () => {
    expect(validateNeed(draft(), 'active')).toMatchObject({
      skills: expect.any(String),
      workFormatIds: expect.any(String),
    });
    expect(
      validateNeed(
        {
          ...draft(),
          skills: [{ skillId: 'skill', required: false, weight: 1 }],
          workFormatIds: [1],
        },
        'active',
      ),
    ).toEqual({});
  });
  it('не позволяет перевернуть вилку, дробные суммы и некорректный вес', () => {
    expect(
      validateNeed(
        { ...draft(), salaryFromRub: 240000, salaryToRub: 180000 },
        'draft',
      ).salaryToRub,
    ).toBeTruthy();
    expect(
      validateNeed({ ...draft(), salaryFromRub: 1.5 }, 'draft').salaryFromRub,
    ).toBeTruthy();
    expect(
      validateNeed(
        {
          ...draft(),
          skills: [{ skillId: 'skill', required: true, weight: 0.001 }],
        },
        'draft',
      ).skills,
    ).toBeTruthy();
  });
  it('проверяет пояс и обязательные тексты', () => {
    expect(
      validateNeed(
        { ...draft(), timezone: 'wrong/timezone', title: ' ', description: '' },
        'draft',
      ),
    ).toMatchObject({
      timezone: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
    });
  });
  it('исключает readonly-поля и не отправляет неизменённые поля в PATCH', () => {
    const current: EmployerNeed = {
      ...draft(),
      id: 'need',
      companyId: 'company',
      createdBy: 'user',
      createdAt: 'date',
    };
    expect(toNeedInput(current)).not.toHaveProperty('id');
    expect(
      changedNeedFields(current, { ...current, salaryFromRub: 0 }),
    ).toEqual({ salaryFromRub: 0 });
    expect(changedNeedFields(current, { ...current, city: null })).toEqual({});
    expect(
      changedNeedFields(
        { ...current, gradeId: 1 },
        { ...current, gradeId: null },
      ),
    ).toEqual({ gradeId: null });
  });
});
