import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { cn } from '@/shared/lib/utils';
import {
  BrandLogo,
  HeaderBar,
  headerNavItemClassName,
  ThemeToggle,
} from '@/shared/ui';
import { RememberRole, type SessionUser } from '@/entities/session';
import { UserMenu } from '@/features/auth';
import {
  EMPLOYER_NAV_FROM,
  EMPLOYER_NAV_ITEMS,
  HeaderGuidesButton,
  HeaderMenuExtra,
  HeaderNavLabel,
} from '@/widgets/app-header';

import type { EmployerSection } from '../constants';

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
  const renderItems = (items: typeof EMPLOYER_NAV_ITEMS) => (
    <>
      {items.map((item) => {
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
            aria-label={item.label}
            title={item.label}
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
    <>
      <RememberRole role={user.role} />
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
        nav={renderItems(EMPLOYER_NAV_ITEMS)}
        navFrom={EMPLOYER_NAV_FROM}
        tabs={renderItems(EMPLOYER_NAV_ITEMS)}
        menuExtra={<HeaderMenuExtra />}
        actions={
          <>
            {/* На телефоне справочник и тема — в меню-бургере. */}
            <HeaderGuidesButton className="max-sm:hidden" />
            <span className="contents max-sm:hidden">
              <ThemeToggle />
            </span>
            <UserMenu user={user} />
          </>
        }
      />
    </>
  );
};
