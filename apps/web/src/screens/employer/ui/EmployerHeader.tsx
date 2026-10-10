import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { cn } from '@/shared/lib/utils';
import {
  BrandLogo,
  HeaderBar,
  headerNavItemClassName,
  ThemeToggle,
} from '@/shared/ui';
import type { SessionUser } from '@/entities/session';
import { UserMenu } from '@/features/auth';
import {
  EMPLOYER_NAV_ITEMS,
  GUIDES_NAV_ITEM,
  HeaderGuidesButton,
  HeaderNavLabel,
} from '@/widgets/app-header';

import type { EmployerSection } from '../constants/sections';

// Пункты те же, что в общей шапке сайта; здесь переходы идут через
// защиту несохранённых изменений кабинета. Настройки компании (профиль,
// документы, сотрудники) — вкладками внутри раздела «Компании».
const COMPANY_SECTIONS: EmployerSection[] = [
  'overview',
  'profile',
  'documents',
  'team',
  'invitation',
];

interface EmployerHeaderProps {
  user: SessionUser;
  section: EmployerSection;
  busy: boolean;
  hasCompany: boolean;
  href: (section: EmployerSection) => string;
  onNavigate: (section: EmployerSection) => void;
}

export const EmployerHeader = ({
  user,
  section,
  busy,
  hasCompany,
  href,
  onNavigate,
}: EmployerHeaderProps) => {
  const workItems = (
    <>
      {EMPLOYER_NAV_ITEMS.map((item) => {
        const target = item.id as EmployerSection;
        const disabled = busy || (!hasCompany && target !== 'overview');
        const active =
          target === 'overview'
            ? COMPANY_SECTIONS.includes(section)
            : section === target;
        return (
          <Link
            key={item.id}
            data-preserve-draft
            href={href(target)}
            aria-current={active ? 'page' : undefined}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : undefined}
            onNavigate={(e) => {
              e.preventDefault();
              if (!disabled) onNavigate(target);
            }}
            onClick={(e) => {
              if (disabled) e.preventDefault();
            }}
            className={cn(
              headerNavItemClassName,
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <HeaderNavLabel item={item} />
          </Link>
        );
      })}
    </>
  );
  return (
    <HeaderBar
      navLabel="Основная навигация кабинета"
      brand={
        <Link
          data-preserve-draft
          href={STATIC_ROUTES.EMPLOYER}
          className="flex min-h-11 items-center"
          aria-label="ФСП Скаут — главная кабинета"
          onNavigate={(e) => {
            e.preventDefault();
            onNavigate('overview');
          }}
          onClick={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <BrandLogo />
        </Link>
      }
      nav={
        <>
          {workItems}
          <Link
            data-preserve-draft
            href={GUIDES_NAV_ITEM.href}
            className={headerNavItemClassName}
          >
            <HeaderNavLabel item={GUIDES_NAV_ITEM} />
          </Link>
        </>
      }
      mobileNav={workItems}
      actions={
        <>
          <HeaderGuidesButton />
          <ThemeToggle />
          <UserMenu user={user} />
        </>
      }
    />
  );
};
