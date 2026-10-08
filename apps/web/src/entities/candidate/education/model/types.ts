export const EDUCATION_LEVELS = [
  'secondary',
  'vocational',
  'incomplete_higher',
  'higher',
  'bachelor',
  'master',
  'phd',
  'doctor',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export type CandidateEducation = {
  id: string;
  level: EducationLevel;
  institution: string;
  specialty: string;
  graduationYear: number;
  createdAt: string;
  updatedAt: string;
};

export type CandidateEducations = {
  items: CandidateEducation[];
};
