import type { EducationLevel } from '@/entities/candidate';

export type EducationFormValues = {
  level: EducationLevel | '';
  institution: string;
  specialty: string;
  graduationYear: string;
};
