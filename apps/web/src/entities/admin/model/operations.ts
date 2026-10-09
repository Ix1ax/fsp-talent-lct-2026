export type AdminCompanyFile = {
  id: string;
  purpose: 'company_document' | 'company_logo';
  original_name: string;
  media_type: 'application/pdf' | 'image/jpeg' | 'image/png';
  size_bytes: number;
  checksum_sha256: string;
  status: 'pending' | 'ready' | 'deleting' | 'deleted';
  created_at: string;
};

export type AdminTaskFile = {
  id: string;
  purpose: 'company_task' | 'task_solution';
  original_name: string;
  media_type:
    | 'application/pdf'
    | 'image/jpeg'
    | 'image/png'
    | 'application/zip'
    | 'text/plain; charset=utf-8';
  size_bytes: number;
  checksum_sha256: string;
  status: 'ready';
  created_at: string;
};

export type AdminCompany = {
  id: string;
  status: 'active' | 'blocked';
  blocked_reason: string | null;
  blocked_at: string | null;
  name: string;
  description: string | null;
  inn: string | null;
  contact_email: string;
  contact_url: string | null;
  logo_file_id: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_version: number;
  verification_requested_at: string | null;
  verification_reviewed_at: string | null;
  verification_reviewed_by: string | null;
  verification_reason: string | null;
  verification_document_ids: string[];
  created_at: string;
};

export type AdminUser = {
  full_name: string | null;
  full_name_source: 'candidate_contacts' | 'identity' | null;
  email: string | null;
  contact_email: string | null;
  identity_updated_at: string | null;
  id: string;
  role: 'candidate' | 'employer' | 'admin';
  status: 'active' | 'blocked' | 'deleted';
  blocked_reason: string | null;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
  candidate_profile_id: string | null;
  search_status: 'open' | 'passive' | 'hidden' | null;
};

export type AdminNeed = {
  id: string;
  company_id: string;
  created_by: string;
  specialization_id: number;
  grade_id: number | null;
  title: string;
  description: string;
  salary_from_rub: number | null;
  salary_to_rub: number | null;
  city: string | null;
  timezone: string | null;
  status: 'draft' | 'active' | 'archived';
  skills: {
    skill_id: string;
    required?: boolean;
    weight: number;
  }[];
  work_format_ids: number[];
  created_at: string;
  moderation_status: 'published' | 'hidden';
  company_name: string;
};

export type AdminOffer = {
  id: string;
  company_id: string;
  candidate_id: string;
  created_by: string;
  need_id: string | null;
  company_name: string;
  title: string;
  description: string;
  salary_from_rub: number;
  salary_to_rub: number;
  status: 'sent' | 'viewed' | 'accepted' | 'rejected';
  created_at: string;
  viewed_at: string | null;
  responded_at: string | null;
};

export type AdminCompanyTask = {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  description: string;
  specialization_id: number | null;
  grade_id: number | null;
  deadline_at: string | null;
  file: AdminTaskFile;
  status: 'open' | 'closed';
  published_at: string;
  published_on: string;
  moderation_status: 'published' | 'hidden';
  created_by: string;
  submissions_count: number;
};

export type AdminAssessmentAttempt = {
  id: string;
  candidate_id: string;
  template_id: string;
  specialization_id: number;
  grade_id: number;
  stack_skill_id: string | null;
  stack_name: string | null;
  status: 'active' | 'passed' | 'failed' | 'expired';
  started_at: string;
  deadline_at: string;
  finished_at: string | null;
  time_limit_sec: number;
  pass_score: number;
  score_percent: number | null;
};

export type AdminCompanyMember = {
  full_name: string | null;
  full_name_source: 'candidate_contacts' | 'identity' | null;
  email: string | null;
  contact_email: string | null;
  identity_updated_at: string | null;
  user_role: 'candidate' | 'employer' | 'admin';
  user_blocked_reason: string | null;
  user_blocked_at: string | null;
  company_id: string;
  user_id: string;
  role: 'owner' | 'recruiter' | 'viewer';
  status: 'active' | 'inactive';
  joined_at: string;
  user_status: 'active' | 'blocked' | 'deleted';
};

export type AdminUserCompany = {
  company_id: string;
  company_name: string;
  company_status: 'active' | 'blocked';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  role: 'owner' | 'recruiter' | 'viewer';
  status: 'active' | 'inactive';
  joined_at: string;
};

export type AdminAuditEvent = {
  actor_email: string | null;
  actor_name: string | null;
  source: 'operations' | 'catalogs' | 'assessments' | 'admins' | 'activity';
  id: string;
  actor_id: string | null;
  actor_kind: 'admin' | 'user' | 'system';
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_status: string | null;
  new_status: string | null;
  reason: string | null;
  created_at: string;
};

export type AdminStats = {
  generated_at: string;
  users: {
    total: number;
    active: number;
    blocked: number;
    deleted: number;
    candidates: number;
    employers: number;
  };
  companies: {
    total: number;
    active: number;
    blocked: number;
    pending: number;
    verified: number;
    rejected: number;
  };
  needs: {
    total: number;
    active: number;
    hidden: number;
  };
  offers: {
    total: number;
    accepted: number;
    rejected: number;
  };
  tasks: {
    total: number;
    hidden: number;
    open: number;
  };
  submissions: {
    total: number;
    reviewed: number;
  };
  attempts: {
    total: number;
    passed: number;
    failed: number;
    active: number;
  };
  skills_pending: number;
};
