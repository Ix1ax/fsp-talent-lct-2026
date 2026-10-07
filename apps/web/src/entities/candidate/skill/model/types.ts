export type SkillModerationStatus =
  'approved' | 'pending' | 'rejected' | 'archived' | 'merged';
export type SkillConfirmationSource = 'claimed' | 'test' | 'fsp';
export type ClaimedLevel = 1 | 2 | 3 | 4 | 5;

export type CandidateSkill = {
  moderationStatus: SkillModerationStatus;
  skillId: string;
  code: string;
  name: string;
  claimedLevel: ClaimedLevel;
  verifiedLevel?: ClaimedLevel | null;
  source: SkillConfirmationSource;
  confidence: number;
  updatedAt: string;
};

export type CandidateSkills = {
  items: CandidateSkill[];
};
