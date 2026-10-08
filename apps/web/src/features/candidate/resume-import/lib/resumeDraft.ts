import type {
  ResumeDraft,
  ResumeEducation,
  ResumeExperience,
} from '@/entities/candidate';

import type { ContactsFormValues } from '../../contacts';
import type { EducationFormValues } from '../../education';
import type { ExperienceFormValues } from '../../experience';
import type { ProfileFormValues } from '../../profile';
import type { ResumeCurrentDraft, ResumeFieldChange } from '../model/types';

export const getResumeFormPatches = (draft: ResumeDraft) => {
  const profile: Partial<ProfileFormValues> = {};
  for (const field of ['headline', 'city', 'summary'] as const) {
    if (draft[field]?.trim()) profile[field] = draft[field] as string;
  }
  if (draft.salaryMinRub != null)
    profile.salaryMinRub = String(draft.salaryMinRub);
  if (draft.workFormatIds?.length) profile.workFormatIds = draft.workFormatIds;
  const contacts: Partial<ContactsFormValues> = {};
  for (const field of ['fullName', 'email', 'phone', 'telegram'] as const) {
    if (draft.contacts?.[field]?.trim())
      contacts[field] = draft.contacts[field] as string;
  }
  return { profile, contacts };
};

const labels: Record<string, string> = {
  headline: 'Заголовок профиля',
  city: 'Город',
  summary: 'О себе',
  salaryMinRub: 'Зарплата от, ₽',
  workFormatIds: 'Форматы работы',
  fullName: 'Имя и фамилия',
  email: 'Email',
  phone: 'Телефон',
  telegram: 'Telegram',
};

export const getResumeChanges = (
  draft: ResumeDraft,
  current: ResumeCurrentDraft,
): ResumeFieldChange[] => {
  const patches = getResumeFormPatches(draft);
  return (['profile', 'contacts'] as const).flatMap((section) =>
    Object.entries(patches[section])
      .filter(
        ([key, value]) =>
          JSON.stringify(current[section][key]) !== JSON.stringify(value),
      )
      .map(([key, next]) => ({
        label: labels[key],
        previous: current[section][key],
        next,
      })),
  );
};

export const toResumeExperienceValues = (
  record: ResumeExperience,
): ExperienceFormValues => ({
  company: record.company ?? '',
  position: record.position ?? '',
  startedOn: record.startedOn ?? '',
  endedOn: record.endedOn ?? '',
  current: record.endedOn === null,
  description: record.description ?? '',
});

export const toResumeEducationValues = (
  record: ResumeEducation,
): EducationFormValues => ({
  level: record.level ?? '',
  institution: record.institution ?? '',
  specialty: record.specialty ?? '',
  graduationYear:
    record.graduationYear == null ? '' : String(record.graduationYear),
});

const normalize = (value: string) => value.trim().toLocaleLowerCase('ru');
export const sameResumeExperience = (
  a: ResumeExperience,
  b: ResumeExperience,
) =>
  normalize(a.company) === normalize(b.company) &&
  normalize(a.position) === normalize(b.position) &&
  a.startedOn === b.startedOn &&
  a.endedOn === b.endedOn;

export const sameResumeEducation = (a: ResumeEducation, b: ResumeEducation) =>
  normalize(a.institution) === normalize(b.institution) &&
  normalize(a.specialty) === normalize(b.specialty) &&
  a.level === b.level &&
  a.graduationYear === b.graduationYear;

export const sameResumeSkill = (
  a: { name: string; skillId?: string | null },
  b: { name: string; skillId?: string | null },
) =>
  !!(a.skillId && a.skillId === b.skillId) ||
  normalize(a.name) === normalize(b.name);
