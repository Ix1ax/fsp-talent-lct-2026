import type { SearchStatus } from '@/entities/candidate-profile';

export type ProfileFormValues = {
  headline: string;
  summary: string;
  city: string;
  timezone: string;
  experienceYears: string;
  salaryMinRub: string;
  searchStatus: SearchStatus;
  workFormatIds: number[];
};
