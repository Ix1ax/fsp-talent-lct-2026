export type NeedStatus = 'active' | 'draft' | 'archived';

export type NeedSkill = {
  skillId: string;
  required: boolean;
  weight: number;
};

export type NeedInput = {
  title: string;
  description: string;
  specializationId: number;
  gradeId: number | null;
  salaryFromRub: number | null;
  salaryToRub: number | null;
  city: string | null;
  timezone: string | null;
  skills: NeedSkill[];
  workFormatIds: number[];
  status: NeedStatus;
};

export type EmployerNeed = NeedInput & {
  id: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
};

export type Recommendation = {
  id: string;
  city: string | null;
  timezone: string | null;
  experienceMonths: number;
  salaryMinRub: number | null;
  searchStatus: string;
  workFormatIds: number[];
  matchedConditions: number;
  reasons: string[];
  unknownConditions: string[];
};

export type RecommendationPage = {
  items: Recommendation[];
  total: number;
  limit: number;
  offset: number;
  needId: string;
  matchingMode: string;
  unassessedCriteria: string[];
};
