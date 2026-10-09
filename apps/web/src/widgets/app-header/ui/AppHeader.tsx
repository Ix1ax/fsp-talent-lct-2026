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
                exclude={[STATIC_ROUTES.ASSESSMENTS]}
              >
                Профиль
              </HeaderNavLink>
              <HeaderNavLink href={STATIC_ROUTES.ASSESSMENTS}>
                Тестирование
              </HeaderNavLink>
            </>
          )}
          {role === USER_ROLES.EMPLOYER && (
            <HeaderNavLink href={STATIC_ROUTES.EMPLOYER}>
              Потребности
            </HeaderNavLink>
          )}
          <HeaderNavLink href={STATIC_ROUTES.GUIDES}>Справочник</HeaderNavLink>
        </>
      }
      actions={
        <>
          <ThemeToggle />
          {session.kind === 'user' ? (
            <UserMenu user={session.user} />
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
