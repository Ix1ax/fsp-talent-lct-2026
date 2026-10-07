export type NeedStatus = 'active' | 'draft' | 'archived';
export interface NeedSkill {
  skillId: string;
  required: boolean;
  weight: number;
}
export interface NeedInput {
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
}
export interface EmployerNeed extends NeedInput {
  id: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
}
export interface Recommendation {
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
}
export interface RecommendationPage {
  items: Recommendation[];
  total: number;
  limit: number;
  offset: number;
  needId: string;
  matchingMode: string;
  unassessedCriteria: string[];
}
