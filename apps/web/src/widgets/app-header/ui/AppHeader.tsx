import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  BrandLogo,
  Button,
  HeaderBar,
  HeaderNavLink,
  ThemeToggle,
} from '@/shared/ui';
import { getRoleHomeRoute, USER_ROLES } from '@/entities/session';
import { loadSession } from '@/entities/session/api/server';
import { UserMenu } from '@/features/auth';
import { OffersNotification } from '@/features/candidate';

import {
  getHeaderNavFrom,
  getHeaderNavItems,
  type HeaderNavItem,
} from '../model';
import { AppHeaderPosition } from './AppHeaderPosition';
import { HeaderGuidesButton } from './HeaderGuidesButton';
import { HeaderMenuExtra } from './HeaderMenuExtra';
import { HeaderNavLabel } from './HeaderNavLabel';

interface BrandProps {
  href: string;
  label: string;
}

// Шапка всегда в одну строку: разделы при нехватке места уходят в меню.
const Brand = ({ href, label }: BrandProps) => (
  <Link href={href} className="flex min-h-11 items-center" aria-label={label}>
    <BrandLogo />
  </Link>
);

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

export const AppHeader = async () => {
  const session = await loadSession();
  const role = session.kind === 'user' ? session.user.role : undefined;
  const items = getHeaderNavItems(role);
  const hasNav = items.length > 0;

  return (
    <AppHeaderPosition>
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
        tabs={
          hasNav
            ? renderItems(items.filter((item) => !item.secondary))
            : undefined
        }
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
    </AppHeaderPosition>
  );
};
