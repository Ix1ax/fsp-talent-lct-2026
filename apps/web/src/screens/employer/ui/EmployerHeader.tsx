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

import type { EmployerSection } from '../constants/sections';

// Рабочие разделы — в шапке; настройки компании (профиль, документы,
// сотрудники) — вкладками внутри раздела «Компании».
const LINKS = [
  { section: 'overview', label: 'Компании' },
  { section: 'vacancies', label: 'Потребности' },
  { section: 'candidates', label: 'Банк соискателей' },
  { section: 'offers', label: 'Предложения' },
] as const;

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
}: EmployerHeaderProps) => (
  <HeaderBar
    navLabel="Основная навигация кабинета"
    mobileNav
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
        <span className="sm:hidden">
          <BrandLogo compact />
        </span>
        <span className="hidden sm:inline-flex">
          <BrandLogo />
        </span>
      </Link>
    }
    nav={
      <>
        {LINKS.map((item) => {
          const disabled = busy || (!hasCompany && item.section !== 'overview');
          const active =
            item.section === 'overview'
              ? COMPANY_SECTIONS.includes(section)
              : section === item.section;
          return (
            <Link
              key={item.section}
              data-preserve-draft
              href={href(item.section)}
              aria-current={active ? 'page' : undefined}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : undefined}
              onNavigate={(e) => {
                e.preventDefault();
                if (!disabled) onNavigate(item.section);
              }}
              onClick={(e) => {
                if (disabled) e.preventDefault();
              }}
              className={cn(
                headerNavItemClassName,
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          data-preserve-draft
          href={STATIC_ROUTES.GUIDES}
          className={headerNavItemClassName}
        >
          Справочник
        </Link>
      </>
    }
    actions={
      <>
        <ThemeToggle />
        <UserMenu user={user} />
      </>
    }
  />
);
