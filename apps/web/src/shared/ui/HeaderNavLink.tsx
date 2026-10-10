'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { headerNavItemClassName } from './HeaderBar';

interface HeaderNavLinkProps {
  href: string;
  children: ReactNode;
  exact?: boolean;
  /** Префиксы, при которых пункт не считается активным (вложенный раздел с собственным пунктом). */
  exclude?: string[];
  /** Дополнительные префиксы, при которых пункт активен. */
  include?: string[];
}

export const HeaderNavLink = ({
  href,
  children,
  exact,
  exclude = [],
  include = [],
}: HeaderNavLinkProps) => {
  const pathname = usePathname();
  const matches = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  const active =
    (matches && !exclude.some((prefix) => pathname.startsWith(prefix))) ||
    include.some((prefix) => pathname.startsWith(prefix));

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={headerNavItemClassName}
    >
      {children}
    </Link>
  );
};
