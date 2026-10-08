import type {
  CandidateEducation,
  SaveCandidateEducationInput,
} from '@/entities/candidate';

import type { EducationFormValues } from '../model';

export const toEducationFormValues = (
  record?: CandidateEducation,
): EducationFormValues => ({
  level: record?.level ?? '',
  institution: record?.institution ?? '',
  specialty: record?.specialty ?? '',
  graduationYear: record ? String(record.graduationYear) : '',
});

export const toEducationInput = (
  values: EducationFormValues,
): SaveCandidateEducationInput => {
  if (!values.level) throw new Error('Выберите уровень образования.');
  return {
    level: values.level,
    institution: values.institution.trim(),
    specialty: values.specialty.trim(),
    graduationYear: Number(values.graduationYear),
  };
};
