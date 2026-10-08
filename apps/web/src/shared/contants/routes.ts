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
