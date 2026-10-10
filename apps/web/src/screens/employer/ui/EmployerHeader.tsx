import Link from 'next/link';
import { BriefcaseBusinessIcon, Building2Icon, SearchIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { cn } from '@/shared/lib/utils';
import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';
import type { SessionUser } from '@/entities/session';
import { UserMenu } from '@/features/auth';

import type { EmployerSection } from '../constants/sections';

const LINKS = [
  {
    section: 'overview',
    label: 'Компании',
    shortLabel: 'Компании',
    icon: Building2Icon,
  },
  {
    section: 'vacancies',
    label: 'Потребности',
    shortLabel: 'Потребности',
    icon: BriefcaseBusinessIcon,
  },
  {
    section: 'candidates',
    label: 'Банк соискателей',
    shortLabel: 'Соискатели',
    icon: SearchIcon,
  },
] as const;
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
  <header className="sticky top-0 z-40 bg-background/95 px-3 pt-3 pb-2 backdrop-blur sm:px-5">
    <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border/60 bg-muted/50 px-3 py-2 sm:px-4">
      <Link
        data-preserve-draft
        href={STATIC_ROUTES.EMPLOYER}
        className="flex min-h-11 shrink-0 items-center"
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
      <nav
        aria-label="Основная навигация кабинета"
        className="order-3 flex w-full min-w-0 gap-1 overflow-x-auto border-t border-border/50 pt-2 lg:order-none lg:w-auto lg:border-0 lg:pt-0"
      >
        {LINKS.map((item) => {
          const disabled = busy || (!hasCompany && item.section !== 'overview');
          const active =
            section === item.section ||
            (item.section === 'overview' &&
              ['profile', 'documents', 'team', 'invitation'].includes(section));
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
                'flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-ring sm:gap-2 sm:px-3 sm:text-sm',
                active && 'bg-card text-brand-text shadow-xs',
                disabled && 'opacity-50',
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button asChild variant="ghost" className="min-h-11 px-2 sm:px-3">
          <Link href={STATIC_ROUTES.GUIDES}>Справочник</Link>
        </Button>
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </div>
  </header>
);
