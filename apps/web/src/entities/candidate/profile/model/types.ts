export type SearchStatus = 'hidden' | 'open' | 'passive';

export type CandidateProfile = {
  id: string;
  avatarFileId: string | null;
  headline: string | null;
  summary: string | null;
  city: string | null;
  timezone: string | null;
  experienceMonths: number;
  salaryMinRub: number | null;
  searchStatus: SearchStatus;
  workFormatIds: number[];
  updatedAt: string;
};
