export const STATIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  CABINET: '/cabinet',
  CANDIDATE: '/candidate',
  EMPLOYER: '/employer',
  GUIDES: '/guides',
  LEGAL: '/legal',
  ASSESSMENTS: '/candidate/assessments',
} as const;

export const DYNAMIC_ROUTES = {
  CANDIDATE: (path: string) => `/candidate/${path}`,
  LEGAL: (slug: string) => `/legal/${slug}`,
};
