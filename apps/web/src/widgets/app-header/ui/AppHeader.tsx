import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  BrandLogo,
  Button,
  HeaderBar,
  HeaderNavLink,
  ThemeToggle,
} from '@/shared/ui';
import { USER_ROLES } from '@/entities/session';
import { loadSession } from '@/entities/session/api/server';
import { UserMenu } from '@/features/auth';
import { OffersNotification } from '@/features/candidate';

const Brand = () => (
  <Link
    href={STATIC_ROUTES.HOME}
    className="flex min-h-11 items-center"
    aria-label="ФСП Скаут — главная"
  >
    <span className="sm:hidden">
      <BrandLogo compact />
    </span>
    <span className="hidden sm:inline-flex">
      <BrandLogo />
    </span>
  </Link>
);

export const AppHeader = async () => {
  const session = await loadSession();
  const role = session.kind === 'user' ? session.user.role : undefined;

  return (
    <HeaderBar
      brand={<Brand />}
      mobileNav
      nav={
        <>
          {role === USER_ROLES.CANDIDATE && (
            <>
              <HeaderNavLink
                href={STATIC_ROUTES.CANDIDATE}
                exclude={[
                  STATIC_ROUTES.CANDIDATE_ASSESSMENTS,
                  STATIC_ROUTES.OFFERS,
                ]}
              >
                Профиль
              </HeaderNavLink>
              <HeaderNavLink href={STATIC_ROUTES.CANDIDATE_ASSESSMENTS}>
                Тестирование
              </HeaderNavLink>
              <HeaderNavLink href={STATIC_ROUTES.OFFERS}>
                Предложения
              </HeaderNavLink>
            </>
          )}
          {role === USER_ROLES.EMPLOYER && (
            <HeaderNavLink href={STATIC_ROUTES.EMPLOYER}>Кабинет</HeaderNavLink>
          )}
          <HeaderNavLink href={STATIC_ROUTES.GUIDES}>Справочник</HeaderNavLink>
        </>
      }
      actions={
        <>
          {session.kind === 'user' && role === USER_ROLES.CANDIDATE && (
            <OffersNotification key={session.user.id} />
          )}
          <ThemeToggle />
          {session.kind === 'user' ? (
            <UserMenu user={session.user} />
          ) : session.kind === 'unavailable' ? (
            <div className="flex items-center gap-2">
              {session.displayName && (
                <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                  {session.displayName}
                </span>
              )}
              <span
                className="inline-flex h-6 items-center rounded-sm bg-warning-soft px-2 text-xs font-medium text-warning"
                role="status"
              >
                Сервис недоступен
              </span>
            </div>
          ) : (
            <Button asChild>
              <Link href={STATIC_ROUTES.LOGIN}>Войти</Link>
            </Button>
          )}
        </>
      }
    />
  );
};
