export const STATIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  CABINET: '/cabinet',
  AUTH_CALLBACK: '/auth/callback',
  DEMO_EMPLOYER: '/demo/employer',
  ADMIN: '/admin',
  ADMIN_CATALOGS: '/admin/catalogs',
  ADMIN_MODERATION: '/admin/moderation',
  ADMIN_QUESTIONS: '/admin/questions',
  ADMIN_QUESTION_NEW: '/admin/questions/new',
  ADMIN_TEMPLATES: '/admin/templates',
  ADMIN_TEMPLATE_NEW: '/admin/templates/new',
  ADMIN_ACCOUNTS: '/admin/admins',
  CANDIDATE: '/candidate',
  CANDIDATE_CONSENTS: '/candidate/consents',
  CANDIDATE_PROFILE: '/candidate/profile',
  CANDIDATE_CONTACTS: '/candidate/contacts',
  CANDIDATE_EXPERIENCE: '/candidate/experience',
  CANDIDATE_EDUCATION: '/candidate/education',
  CANDIDATE_SKILLS: '/candidate/skills',
  CANDIDATE_READINESS: '/candidate/readiness',
  CANDIDATE_TASKS: '/candidate/tasks',
  CANDIDATE_TASK_SUBMISSIONS: '/candidate/task-submissions',
  CANDIDATE_ASSESSMENTS: '/candidate/assessments',
  EMPLOYER: '/employer',
  EMPLOYER_PROFILE: '/employer/profile',
  EMPLOYER_DOCUMENTS: '/employer/documents',
  EMPLOYER_TEAM: '/employer/team',
  EMPLOYER_VACANCIES: '/employer/vacancies',
  EMPLOYER_CANDIDATES: '/employer/candidates',
  EMPLOYER_OFFERS: '/employer/offers',
  EMPLOYER_TASKS: '/employer/tasks',
  EMPLOYER_INVITATION: '/employer/invitation',
  GUIDES: '/guides',
  LEGAL: '/legal',
  OFFERS: '/candidate/offers',
} as const;

export const DYNAMIC_ROUTES = {
  CANDIDATE: (path: string) => `${STATIC_ROUTES.CANDIDATE}/${path}`,
  CANDIDATE_ASSESSMENT: (attemptId: string) =>
    `${STATIC_ROUTES.CANDIDATE_ASSESSMENTS}/${encodeURIComponent(attemptId)}`,
  EMPLOYER: (path: string) => `${STATIC_ROUTES.EMPLOYER}/${path}`,
  ADMIN: (path: string) => `${STATIC_ROUTES.ADMIN}/${path}`,
  ADMIN_TEMPLATE: (id: string, action?: 'edit' | 'preview') =>
    `${STATIC_ROUTES.ADMIN_TEMPLATES}/${encodeURIComponent(id)}${action ? `/${action}` : ''}`,
  ADMIN_QUESTION: (id: string, action?: 'edit') =>
    `${STATIC_ROUTES.ADMIN_QUESTIONS}/${encodeURIComponent(id)}${action ? `/${action}` : ''}`,
  LEGAL: (slug: string) => `${STATIC_ROUTES.LEGAL}/${slug}`,
};

export const EMPLOYER_DRAFT_SCOPE = ['company'] as const;
export const EMPLOYER_NEED_DRAFT_SCOPE = ['company', 'need'] as const;
