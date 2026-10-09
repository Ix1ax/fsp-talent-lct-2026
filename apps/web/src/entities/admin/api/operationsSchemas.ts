import { z } from 'zod';

export const adminCompanyFileSchema = z.object({
  id: z.string(),
  purpose: z.enum(['company_document', 'company_logo']),
  original_name: z.string(),
  media_type: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  size_bytes: z.number().int().min(1),
  checksum_sha256: z.string(),
  status: z.enum(['pending', 'ready', 'deleting', 'deleted']),
  created_at: z.string(),
});

export const adminTaskFileSchema = z.object({
  id: z.string(),
  purpose: z.enum(['company_task', 'task_solution']),
  original_name: z.string(),
  media_type: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/zip',
    'text/plain; charset=utf-8',
  ]),
  size_bytes: z.number().int().min(1),
  checksum_sha256: z.string(),
  status: z.enum(['ready']),
  created_at: z.string(),
});

export const adminCompanySchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'blocked']),
  blocked_reason: z.string().nullable(),
  blocked_at: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  inn: z.string().nullable(),
  contact_email: z.string(),
  contact_url: z.string().nullable(),
  logo_file_id: z.string().nullable(),
  verification_status: z.enum([
    'unverified',
    'pending',
    'verified',
    'rejected',
  ]),
  verification_version: z.number().int().min(0),
  verification_requested_at: z.string().nullable(),
  verification_reviewed_at: z.string().nullable(),
  verification_reviewed_by: z.string().nullable(),
  verification_reason: z.string().nullable(),
  verification_document_ids: z.array(z.string()),
  created_at: z.string(),
});

const adminUserIdentityShape = {
  full_name: z.string().nullable(),
  full_name_source: z.enum(['candidate_contacts', 'identity']).nullable(),
  email: z.string().nullable(),
  contact_email: z.string().nullable(),
  identity_updated_at: z.string().nullable(),
};

export const adminUserSchema = z.object({
  ...adminUserIdentityShape,
  id: z.string(),
  role: z.enum(['candidate', 'employer', 'admin']),
  status: z.enum(['active', 'blocked', 'deleted']),
  blocked_reason: z.string().nullable(),
  blocked_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  candidate_profile_id: z.string().nullable(),
  search_status: z.enum(['open', 'passive', 'hidden']).nullable(),
});

export const adminNeedSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  created_by: z.string(),
  specialization_id: z.number().int().min(1),
  grade_id: z.number().int().min(1).nullable(),
  title: z.string(),
  description: z.string(),
  salary_from_rub: z.number().int().min(0).nullable(),
  salary_to_rub: z.number().int().min(0).nullable(),
  city: z.string().nullable(),
  timezone: z.string().nullable(),
  status: z.enum(['draft', 'active', 'archived']),
  skills: z.array(
    z.object({
      skill_id: z.string(),
      required: z.boolean().optional(),
      weight: z.number().min(0.01),
    }),
  ),
  work_format_ids: z.array(z.number().int().min(1)),
  created_at: z.string(),
  moderation_status: z.enum(['published', 'hidden']),
  company_name: z.string(),
});

export const adminOfferSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  candidate_id: z.string(),
  created_by: z.string(),
  need_id: z.string().nullable(),
  company_name: z.string(),
  title: z.string(),
  description: z.string(),
  salary_from_rub: z.number().int(),
  salary_to_rub: z.number().int(),
  status: z.enum(['sent', 'viewed', 'accepted', 'rejected']),
  created_at: z.string(),
  viewed_at: z.string().nullable(),
  responded_at: z.string().nullable(),
});

export const adminCompanyTaskSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  company_name: z.string(),
  title: z.string(),
  description: z.string(),
  specialization_id: z.number().int().min(1).nullable(),
  grade_id: z.number().int().min(1).nullable(),
  deadline_at: z.string().nullable(),
  file: adminTaskFileSchema,
  status: z.enum(['open', 'closed']),
  published_at: z.string(),
  published_on: z.string(),
  moderation_status: z.enum(['published', 'hidden']),
  created_by: z.string(),
  submissions_count: z.number().int().min(0),
});

export const adminAssessmentAttemptSchema = z.object({
  id: z.string(),
  candidate_id: z.string(),
  template_id: z.string(),
  specialization_id: z.number().int(),
  grade_id: z.number().int(),
  stack_skill_id: z.string().nullable(),
  stack_name: z.string().nullable(),
  status: z.enum(['active', 'passed', 'failed', 'expired']),
  started_at: z.string(),
  deadline_at: z.string(),
  finished_at: z.string().nullable(),
  time_limit_sec: z.number().int(),
  pass_score: z.number(),
  score_percent: z.number().nullable(),
});

export const adminCompanyMemberSchema = z.object({
  ...adminUserIdentityShape,
  user_role: z.enum(['candidate', 'employer', 'admin']),
  user_blocked_reason: z.string().nullable(),
  user_blocked_at: z.string().nullable(),
  company_id: z.string(),
  user_id: z.string(),
  role: z.enum(['owner', 'recruiter', 'viewer']),
  status: z.enum(['active', 'inactive']),
  joined_at: z.string(),
  user_status: z.enum(['active', 'blocked', 'deleted']),
});

export const adminUserCompanySchema = z.object({
  company_id: z.string(),
  company_name: z.string(),
  company_status: z.enum(['active', 'blocked']),
  verification_status: z.enum([
    'unverified',
    'pending',
    'verified',
    'rejected',
  ]),
  role: z.enum(['owner', 'recruiter', 'viewer']),
  status: z.enum(['active', 'inactive']),
  joined_at: z.string(),
});

export const adminAuditEventSchema = z.object({
  actor_email: z.string().nullable(),
  actor_name: z.string().nullable(),
  source: z.enum([
    'operations',
    'catalogs',
    'assessments',
    'admins',
    'activity',
  ]),
  id: z.string(),
  actor_id: z.string().nullable(),
  actor_kind: z.enum(['admin', 'user', 'system']),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  old_status: z.string().nullable(),
  new_status: z.string().nullable(),
  reason: z.string().nullable(),
  created_at: z.string(),
});

export const adminStatsSchema = z.object({
  generated_at: z.string(),
  users: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    blocked: z.number().int().min(0),
    deleted: z.number().int().min(0),
    candidates: z.number().int().min(0),
    employers: z.number().int().min(0),
  }),
  companies: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    blocked: z.number().int().min(0),
    pending: z.number().int().min(0),
    verified: z.number().int().min(0),
    rejected: z.number().int().min(0),
  }),
  needs: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    hidden: z.number().int().min(0),
  }),
  offers: z.object({
    total: z.number().int().min(0),
    accepted: z.number().int().min(0),
    rejected: z.number().int().min(0),
  }),
  tasks: z.object({
    total: z.number().int().min(0),
    hidden: z.number().int().min(0),
    open: z.number().int().min(0),
  }),
  submissions: z.object({
    total: z.number().int().min(0),
    reviewed: z.number().int().min(0),
  }),
  attempts: z.object({
    total: z.number().int().min(0),
    passed: z.number().int().min(0),
    failed: z.number().int().min(0),
    active: z.number().int().min(0),
  }),
  skills_pending: z.number().int().min(0),
});

const page = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
  });
export const adminOperationsSchemas = {
  companies: page(adminCompanySchema),
  users: page(adminUserSchema),
  needs: page(adminNeedSchema),
  offers: page(adminOfferSchema),
  tasks: page(adminCompanyTaskSchema),
  attempts: page(adminAssessmentAttemptSchema),
  audit: page(adminAuditEventSchema),
  members: page(adminCompanyMemberSchema),
  userCompanies: page(adminUserCompanySchema),
  files: page(adminCompanyFileSchema),
};
