import type { CandidateCategory } from '@/entities/candidate/profile';

export type AssessmentHistoryItem = {
  id: string;
  stackSkillId: string | null;
  stackName: string | null;
  status: 'active' | 'passed' | 'failed' | 'expired';
  specializationId: number;
  gradeId: number;
  startedAt: string;
  finishedAt: string | null;
  scorePercent: number | null;
  category:
    | (CandidateCategory & {
        stackSkillId: string | null;
        stackName: string | null;
      })
    | null;
};

export type AssessmentHistoryPage = {
  items: AssessmentHistoryItem[];
  total: number;
  limit: number;
  offset: number;
};
