import { STATIC_ROUTES } from '@/shared/contants';
import { type SessionState, USER_ROLES } from '@/entities/session';

type LandingCta = { label: string; href: string; forGuest: boolean };

/**
 * Главная кнопка лендинга: гостю — регистрация, вошедшему — его кабинет.
 * `forGuest` — показывать ссылку «Ищу специалистов»: только когда сессия
 * проверена и это гость (пока она грузится, `session` — null).
 */
export const getLandingCta = (session: SessionState | null): LandingCta => {
  const role = session?.kind === 'user' ? session.user.role : undefined;
  if (role === USER_ROLES.CANDIDATE)
    return {
      label: 'Мой кабинет',
      href: STATIC_ROUTES.CANDIDATE,
      forGuest: false,
    };
  if (role === USER_ROLES.EMPLOYER)
    return {
      label: 'Кабинет работодателя',
      href: STATIC_ROUTES.EMPLOYER,
      forGuest: false,
    };
  return {
    label: 'Создать профиль',
    href: STATIC_ROUTES.CANDIDATE,
    forGuest: session?.kind === 'guest',
  };
};
