import type { CandidateConsents } from '../../consent';
import type { CandidateContacts } from '../../contacts';
import type { CandidateSkill } from '../../skill';
import type { CandidateProfile } from './types';

export type CandidateCategory = {
  specializationId: number;
  specialization: string;
  gradeId: number;
  grade: string;
  confirmedAt: string;
};

export type CandidateReadinessItem = {
  code: string;
  title: string;
  done: boolean;
  required: boolean;
};

export type CandidateReadiness = {
  percent: number;
  readyToPublish: boolean;
  items: CandidateReadinessItem[];
};

export type CandidateFullProfile = {
  profile: CandidateProfile | null;
  consents: CandidateConsents;
  contacts: CandidateContacts | null;
  skills: CandidateSkill[];
  category: CandidateCategory | null;
  achievements: unknown[];
  readiness: CandidateReadiness;
};
