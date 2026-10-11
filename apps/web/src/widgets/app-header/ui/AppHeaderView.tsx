import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  BrandLogo,
  HeaderBar,
  HeaderNavLink,
  Skeleton,
  ThemeToggle,
} from '@/shared/ui';
import {
  getRoleHomeRoute,
  RememberRole,
  type SessionState,
  USER_ROLES,
  type UserRole,
} from '@/entities/session';
import { OffersNotification } from '@/features/candidate';

import {
  getHeaderNavFrom,
  getHeaderNavItems,
  type HeaderNavItem,
} from '../model';
import { AppHeaderPosition } from './AppHeaderPosition';
import { HeaderAccount } from './HeaderAccount';
import { HeaderGuidesButton } from './HeaderGuidesButton';
import { HeaderMenuExtra } from './HeaderMenuExtra';
import { HeaderNavLabel } from './HeaderNavLabel';

interface BrandProps {
  href: string;
  label: string;
}

// Шапка всегда в одну строку: разделы при нехватке места уходят в меню.
const Brand = ({ href, label }: BrandProps) => {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center rounded-lg transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      aria-label={label}
    >
      <BrandLogo />
    </Link>
  );
};

const renderItems = (items: HeaderNavItem[]) =>
  items.map((item) => (
    <HeaderNavLink
      key={item.id}
      href={item.href}
      label={item.label}
      exclude={item.exclude}
      include={item.include}
    >
      <HeaderNavLabel item={item} />
    </HeaderNavLink>
  ));

interface AppHeaderViewProps {
  session: SessionState;
  /** Сессия ещё проверяется в браузере: на месте аккаунта — скелетон. */
  pending?: boolean;
  /** Роль последнего входа: пока сессия проверяется, разделы уже на месте. */
  roleHint?: UserRole | null;
}

export const AppHeaderView = ({
  session,
  pending,
  roleHint,
}: AppHeaderViewProps) => {
  const role =
    session.kind === 'user'
      ? session.user.role
      : (pending && roleHint) || undefined;
  const items = getHeaderNavItems(role);
  const hasNav = items.length > 0;

  return (
    <AppHeaderPosition>
      {session.kind === 'user' && <RememberRole role={session.user.role} />}
      <HeaderBar
        brand={
          role ? (
            <Brand href={getRoleHomeRoute(role)} label="ФСП Скаут — кабинет" />
          ) : (
            <Brand href={STATIC_ROUTES.HOME} label="ФСП Скаут — главная" />
          )
        }
        nav={hasNav ? renderItems(items) : undefined}
        navFrom={getHeaderNavFrom(role)}
        tabs={hasNav ? renderItems(items) : undefined}
        menuExtra={<HeaderMenuExtra />}
        actions={
          <>
            {/* С меню справочник и тема на телефоне переезжают в него. */}
            <HeaderGuidesButton
              labeled={!hasNav}
              className={hasNav ? 'max-sm:hidden' : undefined}
            />
            {session.kind === 'user' && role === USER_ROLES.CANDIDATE && (
              <OffersNotification key={session.user.id} />
            )}
            <span className={hasNav ? 'contents max-sm:hidden' : 'contents'}>
              <ThemeToggle />
            </span>
            {pending ? (
              // Размер как у того, что появится: аватар с меню или «Войти».
              <Skeleton
                aria-label="Проверяем вход"
                className={
                  role
                    ? 'h-10 w-[66px] rounded-lg 2xl:w-44'
                    : 'h-9 w-18 rounded-lg'
                }
              />
            ) : (
              <HeaderAccount session={session} />
            )}
          </>
        }
      />
    </AppHeaderPosition>
  );
};
