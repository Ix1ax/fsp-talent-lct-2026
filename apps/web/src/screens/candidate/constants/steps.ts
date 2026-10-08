export const PROFILE_STEPS = [
  { id: 'consents', title: 'Согласия' },
  { id: 'profile', title: 'Профиль' },
  { id: 'contacts', title: 'Контакты' },
  { id: 'experience', title: 'Опыт работы' },
  { id: 'skills', title: 'Навыки' },
  { id: 'readiness', title: 'Готовность' },
] as const;

export type ProfileStep = (typeof PROFILE_STEPS)[number]['id'];
