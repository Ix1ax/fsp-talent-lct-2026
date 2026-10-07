import type { CandidateCategory } from '../../candidate/profile';

export type AssessmentReason =
  | 'ok'
  | 'attempt_active'
  | 'retake_cooldown'
  | 'already_confirmed'
  | 'consent_required';

export type AvailableAssessment = {
  specializationId: number;
  gradeId: number;
  timeLimitSec: number;
  passScore: number;
  questionCount: number;
  canStart: boolean;
  reason: AssessmentReason;
  retryAt: string | null;
  confirmed: boolean;
};

export type AssessmentAnswer = { selected?: string[]; text?: string };
export type AssessmentQuestion = {
  id: string;
  position: number;
  multiple: boolean;
  skillId: string;
  difficulty: number;
  prompt: {
    text: string;
    code?: string | null;
    language?: string | null;
    options?: { id: string; text: string }[] | null;
  };
  answer: AssessmentAnswer | null;
};

export type AssessmentSkillResult = {
  skillId: string;
  name: string;
  percent: number;
  confirmed: boolean;
  level: number;
};

export type AssessmentResult = {
  passed: boolean;
  scorePercent: number;
  passScore: number;
  skills: AssessmentSkillResult[];
  category: CandidateCategory | null;
  retryAt: string | null;
};

export type AssessmentAttempt = {
  id: string;
  status: string;
  specializationId: number;
  gradeId: number;
  startedAt: string;
  deadlineAt: string;
  finishedAt: string | null;
  timeLimitSec: number;
  questions: AssessmentQuestion[];
  result: AssessmentResult | null;
};
