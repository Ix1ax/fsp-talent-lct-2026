import type { EducationLevel } from '../../education';

export type ResumeExperience = {
  company: string;
  position: string;
  startedOn: string;
  endedOn: string | null;
  description: string;
};

export type ResumeEducation = {
  level: EducationLevel | '' | null;
  institution: string;
  specialty: string;
  graduationYear: number | null;
};

export type ResumeSkill = { name: string; skillId: string | null };
export type ResumeLanguage = { name: string; level: string };

export type ResumeDraft = {
  headline: string | null;
  city: string | null;
  summary: string | null;
  salaryMinRub: number | null;
  workFormatIds: number[];
  contacts: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    telegram: string | null;
  };
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  languages: ResumeLanguage[];
};

export type ResumeImportResult = { draft: ResumeDraft; warnings: string[] };
