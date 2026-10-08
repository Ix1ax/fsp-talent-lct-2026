import type {
  CandidateExperience,
  SaveCandidateExperienceInput,
} from '@/entities/candidate';

import type { ExperienceFormValues } from '../model';

export const toExperienceFormValues = (
  record?: CandidateExperience,
): ExperienceFormValues => ({
  company: record?.company ?? '',
  position: record?.position ?? '',
  startedOn: record?.startedOn ?? '',
  endedOn: record?.endedOn ?? '',
  current: record?.endedOn === null,
  description: record?.description ?? '',
});

export const toExperienceInput = (
  values: ExperienceFormValues,
): SaveCandidateExperienceInput => ({
  company: values.company.trim(),
  position: values.position.trim(),
  startedOn: values.startedOn,
  endedOn: values.current ? null : values.endedOn,
  description: values.description,
});

export const formatExperienceMonth = (value: string): string => {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, 1);
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};
