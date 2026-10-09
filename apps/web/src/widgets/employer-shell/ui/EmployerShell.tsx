'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import type { Company } from '@/entities/company';
import type { SessionUser } from '@/entities/session';
import { UserMenu } from '@/features/auth';

import { CompanySwitcher } from './CompanySwitcher';
import { EmployerBottomNav } from './EmployerBottomNav';
interface EmployerShellProps {
  accountMenu?: ReactNode;
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
}: EmployerShellProps) => (
  <div className="min-h-dvh w-full min-w-0 self-stretch text-left pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
    <header className="flex min-h-14 flex-wrap items-stretch border-b border-border bg-card md:flex-nowrap">
      <Link
        href={homeHref}
        onClick={(event) => {
          event.preventDefault();
          onShowNeeds();
        }}
        className="flex shrink-0 items-center border-r border-border px-3 md:px-4"
        aria-label="ФСП Скаут — потребности"
      >
        <span className="max-lg:hidden">
          <BrandLogo />
        </span>
        <span className="lg:hidden">
          <BrandLogo compact />
        </span>
      </Link>
      <CompanySwitcher
        companies={companies}
        company={company}
        pending={pending}
        onCompany={onCompany}
        onSettings={onSettings}
        onCreateCompany={onCreateCompany}
      />

      <nav
        aria-label="Разделы работодателя"
        className="hidden min-w-0 items-stretch md:flex"
      >
        <a
          href={homeHref}
          onClick={(event) => {
            event.preventDefault();
            onShowNeeds();
          }}
          aria-current="page"
          className="flex items-center border-b-2 border-primary px-3 text-sm font-semibold"
        >
          Потребности
        </a>
        <Button
          variant="ghost"
          className="h-full px-3"
          disabled={!company || pending}
          onClick={onSettings}
        >
          Компания
        </Button>
      </nav>
      <div className="order-last flex w-full min-w-0 items-center border-t border-border px-3 py-2 md:order-none md:ml-auto md:w-auto md:flex-1 md:border-0">
        {search}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-border px-2 md:ml-0 md:px-3">
        <ThemeToggle />
        {accountMenu ?? <UserMenu user={user} compact />}
      </div>
    </header>
    {children}
    <EmployerBottomNav
      onShowNeeds={onShowNeeds}
      company={!!company}
      pending={pending}
      onSettings={onSettings}
    />
  </div>
);
