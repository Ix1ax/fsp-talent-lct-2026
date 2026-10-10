import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { BrandLogo, HeaderBar, HeaderNavLink, ThemeToggle } from '@/shared/ui';
import { getRoleHomeRoute, USER_ROLES } from '@/entities/session';
import { loadSession } from '@/entities/session/api/server';
import { OffersNotification } from '@/features/candidate';

import {
  getHeaderNavItems,
  GUIDES_NAV_ITEM,
  type HeaderNavItem,
} from '../model';
import { AppHeaderPosition } from './AppHeaderPosition';
import { HeaderAccount } from './HeaderAccount';
import { HeaderGuidesButton } from './HeaderGuidesButton';
import { HeaderNavLabel } from './HeaderNavLabel';

interface BrandProps {
  href: string;
  label: string;
}

// Шапка в две строки на узких экранах, поэтому логотип всегда полный.
const Brand = ({ href, label }: BrandProps) => {
  return (
    <Link href={href} className="flex min-h-11 items-center" aria-label={label}>
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

export const AppHeader = async () => {
  const session = await loadSession();
  const role = session.kind === 'user' ? session.user.role : undefined;
  const items = getHeaderNavItems(role);

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
        nav={renderItems(items)}
        mobileNav={
          role
            ? renderItems(
                items.filter((item) => item.id !== GUIDES_NAV_ITEM.id),
              )
            : null
        }
        actions={
          <>
            <HeaderGuidesButton />
            {session.kind === 'user' && role === USER_ROLES.CANDIDATE && (
              <OffersNotification key={session.user.id} />
            )}
            <ThemeToggle />
            <HeaderAccount session={session} />
          </>
        }
      />
    </AppHeaderPosition>
  );
};
