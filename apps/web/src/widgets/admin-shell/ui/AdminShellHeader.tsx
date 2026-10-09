'use client';

import Link from 'next/link';
import { ArrowUpRight, LogOut } from 'lucide-react';

import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';

interface AdminShellHeaderProps {
  exiting: boolean;
  onLogout: () => void;
}

export const AdminShellHeader = ({
  exiting,
  onLogout,
}: AdminShellHeaderProps) => (
  <header className="sticky top-0 z-20 border-b bg-card">
    <div className="flex h-[63px] w-full items-center justify-between gap-2 px-4 sm:gap-4 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          aria-label="ФСП Скаут — админка"
          className="inline-flex size-11 items-center justify-center lg:hidden"
        >
          <BrandLogo compact />
        </Link>
        <span className="hidden text-sm text-muted-foreground lg:inline">
          <span className="hidden sm:inline">Платформа / </span>Управление
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <Button variant="ghost" className="min-h-11 px-2 sm:px-3" asChild>
          <Link href="/" aria-label="Открыть сайт">
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
