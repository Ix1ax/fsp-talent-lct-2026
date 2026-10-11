import { STATIC_ROUTES } from '@/shared/contants';
import { type SessionState, USER_ROLES } from '@/entities/session';

type LandingCta = { label: string; href: string };

/** Главная кнопка лендинга: гостю — регистрация, вошедшему — его кабинет. */
export const getLandingCta = (session: SessionState | null): LandingCta => {
  const role = session?.kind === 'user' ? session.user.role : undefined;
  if (role === USER_ROLES.CANDIDATE)
    return { label: 'Мой кабинет', href: STATIC_ROUTES.CANDIDATE };
  if (role === USER_ROLES.EMPLOYER)
    return { label: 'Кабинет работодателя', href: STATIC_ROUTES.EMPLOYER };
  return { label: 'Создать профиль', href: STATIC_ROUTES.CANDIDATE };
};
