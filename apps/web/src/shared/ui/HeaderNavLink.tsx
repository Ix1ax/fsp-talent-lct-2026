'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { headerNavItemClassName } from './HeaderBar';

interface HeaderNavLinkProps {
  href: string;
  label?: string;
  children: ReactNode;
  exact?: boolean;
  /** Префиксы, при которых пункт не считается активным (вложенный раздел с собственным пунктом). */
  exclude?: string[];
  /** Дополнительные префиксы, при которых пункт активен. */
  include?: string[];
  /** Переход без подтверждения: черновик формы сохраняется (например, справочник). */
  preserveDraft?: boolean;
}

export const HeaderNavLink = ({
  href,
  label,
  children,
  exact,
  exclude = [],
  include = [],
  preserveDraft,
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
      data-preserve-draft={preserveDraft || undefined}
      aria-label={label}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={headerNavItemClassName}
    >
      {children}
    </Link>
  );
};
