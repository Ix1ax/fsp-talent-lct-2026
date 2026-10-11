export type AdminAccount = {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  status: 'active' | 'blocked';
  created_at: string;
};

export type AdminSession = {
  access_token: string;
  token_type: 'Bearer';
  expires_at: string;
  admin: AdminAccount;
};

export type CatalogKind =
  'specializations' | 'skills' | 'grades' | 'work_formats';
export type CatalogItem = {
  id: string;
  code: string;
  name: string;
  active?: boolean;
  rank?: number;
  aliases?: string[];
  moderation_status?: 'pending' | 'approved' | 'rejected' | 'merged';
  submitted_by?: string;
  submitted_at?: string;
  moderated_by?: string;
  moderated_at?: string;
  moderation_reason?: string;
  merged_into?: string;
};

export type QuestionStatus = 'draft' | 'published' | 'archived';
export type QuestionKind = 'choice' | 'code_reading' | 'short_answer';
export type QuestionPrompt = {
  text: string;
  code?: string;
  language?: string;
  options?: { id: string; text: string }[];
};
export type QuestionGrading = {
  type: 'choice' | 'text';
  correct?: string[];
  multiple?: boolean;
  accepted?: string[];
  case_sensitive?: boolean;
};
export type QuestionVersion = {
  version: number;
  status: QuestionStatus;
  created_at: string;
  published_at: string | null;
  prompt: QuestionPrompt;
  grading_spec: QuestionGrading;
};
export type Question = {
  id: string;
  skill_id: string;
  skill_name: string;
  difficulty: number;
  kind: QuestionKind;
  active: boolean;
  created_at: string;
  latest_version: number;
  published_version: number | null;
  versions?: QuestionVersion[];
};
export type TemplateBlueprintItem = {
  skill_id: string;
  difficulty: number;
  question_count: number;
  weight: number;
  skill_name: string;
  available: number;
};
export type Template = {
  id: string;
  stack_skill_id: string;
  stack_name: string | null;
  specialization_id: number;
  grade_id: number;
  version: number;
  time_limit_sec: number;
  pass_score: number;
  status: QuestionStatus;
  created_at: string;
  published_at: string | null;
  blueprint?: TemplateBlueprintItem[];
};
export type Shortage = {
  skill_id: string;
  difficulty: number;
  required: number;
  available: number;
};
export type Page<T> = {
  items: T[];
  limit: number;
  offset: number;
  total?: number;
};
