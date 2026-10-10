'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { HeaderBar, headerNavItemClassName } from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import type { Company } from '@/entities/company';
import type { SessionUser } from '@/entities/session';
import { UserMenu } from '@/features/auth';

import { CompanySwitcher } from './CompanySwitcher';
import { EmployerBottomNav } from './EmployerBottomNav';
interface EmployerShellProps {
  accountMenu?: ReactNode;
  footer?: ReactNode;
  homeHref?: string;
  search?: ReactNode;
  user: SessionUser;
  companies: Company[];
  company: Company | null;
  pending: boolean;
  onCompany: (id: string) => void;
  onShowNeeds: () => void;
  onSettings: () => void;
  onCreateCompany: () => void;
  children: ReactNode;
}

export const EmployerShell = ({
  user,
  accountMenu,
  footer,
  homeHref = STATIC_ROUTES.EMPLOYER,
  search,
  companies,
  company,
  pending,
  onCompany,
  onShowNeeds,
  onSettings,
  onCreateCompany,
  children,
}: EmployerShellProps) => {
  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col self-stretch text-left pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <HeaderBar
        navLabel="Разделы работодателя"
        brand={
          <Link
            href={homeHref}
            onClick={(event) => {
              event.preventDefault();
              onShowNeeds();
            }}
            className="flex min-h-11 items-center"
            aria-label="ФСП Скаут — потребности"
          >
            <span className="max-lg:hidden">
              <BrandLogo />
            </span>
            <span className="lg:hidden">
              <BrandLogo compact />
            </span>
          </Link>
        }
        context={
          <CompanySwitcher
            companies={companies}
            company={company}
            pending={pending}
            onCompany={onCompany}
            onSettings={onSettings}
            onCreateCompany={onCreateCompany}
          />
        }
        nav={
          <>
            <a
              href={homeHref}
              onClick={(event) => {
                event.preventDefault();
                onShowNeeds();
              }}
              aria-current="page"
              className={headerNavItemClassName}
            >
              Потребности
            </a>
            <button
              type="button"
              className={headerNavItemClassName}
              disabled={!company || pending}
              onClick={onSettings}
            >
              Компания
            </button>
          </>
        }
        search={search}
        actions={
          <>
            <ThemeToggle />
            {accountMenu ?? (
              <>
                <span className="md:hidden">
                  <UserMenu user={user} compact />
                </span>
                <span className="max-md:hidden">
                  <UserMenu user={user} />
                </span>
              </>
            )}
          </>
        }
      />
      <div className="flex flex-1 flex-col">{children}</div>
      {footer}
      <EmployerBottomNav
        onShowNeeds={onShowNeeds}
        company={!!company}
        pending={pending}
        onSettings={onSettings}
      />
    </div>
  );
};
