import { describe, expect, it } from 'vitest';

import type { CandidateExperience } from '@/entities/candidate';

import { experienceSchema } from '../../constants';
import {
  formatExperienceMonth,
  toExperienceFormValues,
  toExperienceInput,
} from '../experienceForm';

const record: CandidateExperience = {
  id: 'record',
  company: 'Компания',
  position: 'Разработчик',
  startedOn: '2022-11',
  endedOn: '2023-01',
  description: '',
  createdAt: '',
  updatedAt: '',
};
const values = toExperienceFormValues(record);

describe('experience validation', () => {
  it.each([
    '',
    '2022-00',
    '2022-13',
    '2022-1',
    '2022-11-01',
    '0000-01',
    ' 2022-11',
  ])('rejects invalid starting month %j', (startedOn) => {
    expect(experienceSchema.safeParse({ ...values, startedOn }).success).toBe(
      false,
    );
  });
  it.each(['', '2022-00', '2022-13', '2022-1', '2022-11-01'])(
    'rejects invalid ending month %j for a completed job',
    (endedOn) => {
      expect(experienceSchema.safeParse({ ...values, endedOn }).success).toBe(
        false,
      );
    },
  );
  it('places a reversed period error on the end month', () => {
    const result = experienceSchema.safeParse({
      ...values,
      endedOn: '2022-10',
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ['endedOn'] }),
      );
  });
  it('allows a job starting and ending in the same month', () => {
    expect(
      experienceSchema.safeParse({ ...values, endedOn: values.startedOn })
        .success,
    ).toBe(true);
  });
  it('ignores the retained end month when currently working', () => {
    expect(
      experienceSchema.safeParse({
        ...values,
        current: true,
        endedOn: 'invalid',
      }).success,
    ).toBe(true);
  });
  it.each(['company', 'position'] as const)('requires a nonblank %s', (key) => {
    expect(experienceSchema.safeParse({ ...values, [key]: '  ' }).success).toBe(
      false,
    );
  });
  it('does not invent maximum text lengths or an upper date bound', () => {
    expect(
      experienceSchema.safeParse({
        ...values,
        company: 'Я'.repeat(1000),
        description: 'Я'.repeat(20000),
        startedOn: '2100-01',
        endedOn: '2100-02',
      }).success,
    ).toBe(true);
  });
});

describe('experience form mapping', () => {
  it('preserves existing dates and detects current work from an explicit null', () => {
    expect(values.current).toBe(false);
    expect(toExperienceFormValues({ ...record, endedOn: null })).toMatchObject({
      current: true,
      endedOn: '',
    });
    expect(toExperienceFormValues()).toMatchObject({
      current: false,
      startedOn: '',
      endedOn: '',
    });
  });
  it('sends the complete PUT body with an explicit null for current work', () => {
    expect(
      toExperienceInput({
        ...values,
        company: ' Компания ',
        current: true,
        description: 'Задачи\nРезультаты',
      }),
    ).toEqual({
      company: 'Компания',
      position: record.position,
      startedOn: record.startedOn,
      endedOn: null,
      description: 'Задачи\nРезультаты',
    });
  });
  it('restores the retained ending month when current work is switched off', () => {
    expect(toExperienceInput({ ...values, current: false }).endedOn).toBe(
      '2023-01',
    );
  });
  it('formats months in Russian without interpreting low years as the 1900s', () => {
    expect(formatExperienceMonth('2022-11')).toContain('ноябрь');
    expect(formatExperienceMonth('2022-11')).toContain('2022');
    expect(formatExperienceMonth('0099-01')).not.toContain('1999');
  });
});
