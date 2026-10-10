'use client';

import Link from 'next/link';
import { ArrowUpRight, LogOut } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';

interface AdminShellHeaderProps {
  exiting: boolean;
  onLogout: () => void;
}

export const AdminShellHeader = ({
  exiting,
  onLogout,
}: AdminShellHeaderProps) => (
  <header className="pointer-events-none sticky top-0 z-20 px-4 pt-3 pb-2 sm:px-6 lg:px-8">
    <div className="pointer-events-auto mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/80 px-3 py-2 shadow-xs backdrop-blur-xl supports-backdrop-filter:bg-muted/70 sm:gap-4 sm:px-4">
      <div className="flex items-center gap-3">
        <Link
          href={STATIC_ROUTES.ADMIN}
          aria-label="ФСП Скаут — админка"
          className="inline-flex min-h-11 items-center lg:hidden"
        >
          <BrandLogo />
        </Link>
        <span className="hidden text-sm text-muted-foreground lg:inline">
          <span className="hidden sm:inline">Платформа / </span>Управление
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <Button variant="ghost" className="min-h-11 px-2 sm:px-3" asChild>
          <Link href={STATIC_ROUTES.HOME} aria-label="Открыть сайт">
            <span className="hidden sm:inline">Открыть сайт</span>
            <span className="sm:hidden">Сайт</span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="size-11 lg:hidden"
          aria-label="Выйти из админки"
          disabled={exiting}
          onClick={onLogout}
        >
          <LogOut />
        </Button>
      </div>
    </div>
  </header>
);
