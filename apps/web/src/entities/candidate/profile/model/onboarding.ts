export type CandidateSurvey = {
  stackSkillId: string;
  industry: string;
  specializationId: number;
  gradeId: number;
  softSkills: string[];
  updatedAt: string;
};

export type CandidateOnboarding = {
  nextStep:
    'consent' | 'profile' | 'survey' | 'test' | 'in_progress' | 'complete';
  survey: CandidateSurvey | null;
  latestAttempt: {
    id: string;
    status: 'active' | 'passed' | 'failed' | 'expired';
    specializationId: number;
    gradeId: number;
    deadlineAt: string;
    stackSkillId: string | null;
    stackName: string | null;
  } | null;
};
