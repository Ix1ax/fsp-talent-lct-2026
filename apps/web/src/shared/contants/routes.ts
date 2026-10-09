export const STATIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  CABINET: '/cabinet',
  CANDIDATE: '/candidate',
  EMPLOYER: '/employer',
  GUIDES: '/guides',
} as const;

export const DYNAMIC_ROUTES = {
  CANDIDATE: (path: string) => `/candidate/${path}`,
};

export const CANDIDATE_DRAFT_ROUTES = [
  '/candidate',
  '/candidate/consents',
  '/candidate/profile',
  '/candidate/contacts',
  '/candidate/experience',
  '/candidate/education',
  '/candidate/skills',
  '/candidate/readiness',
] as const;

export const EMPLOYER_DRAFT_ROUTES = [
  '/employer',
  '/employer/profile',
  '/employer/documents',
  '/employer/team',
  '/employer/vacancies',
  '/employer/candidates',
  '/employer/offers',
] as const;
export const EMPLOYER_DRAFT_SCOPE = ['company'] as const;
export const EMPLOYER_NEED_DRAFT_SCOPE = ['company', 'need'] as const;
