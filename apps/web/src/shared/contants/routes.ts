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

// The candidate profile layout keeps these forms mounted between steps.
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
