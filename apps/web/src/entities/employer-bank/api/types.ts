export type BankFilters = {
  specializationId?: number;
  gradeId?: number;
  skillId?: string;
  verifiedSkillOnly?: boolean;
  gradeStatus?: 'all' | 'confirmed' | 'unconfirmed';
  hasFspAchievements?: boolean;
  workFormatIds?: number[];
  experienceMinMonths?: number;
  experienceMaxMonths?: number;
  salaryMaxRub?: number;
};

export type OfferInput = {
  candidateId: string;
  needId?: string | null;
  title: string;
  description: string;
  salaryFromRub: number;
  salaryToRub: number;
  contactEmail: string;
  contactUrl?: string | null;
};
