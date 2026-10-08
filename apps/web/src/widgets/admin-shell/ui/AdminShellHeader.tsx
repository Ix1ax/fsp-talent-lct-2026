'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';

import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';

interface AdminShellHeaderProps {
  exiting: boolean;
  onLogout: () => void;
}

export const AdminShellHeader = ({
  exiting,
  onLogout,
}: AdminShellHeaderProps) => (
  <header className="sticky top-0 z-20 border-b bg-card lg:relative">
    <div className="flex h-16 w-full items-center justify-between gap-4 px-5 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          aria-label="ФСП Скаут — админка"
          className="lg:hidden"
        >
          <BrandLogo compact />
        </Link>
        <span className="hidden text-sm text-muted-foreground lg:inline">
          <span className="hidden sm:inline">Платформа / </span>Управление
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href="/">Открыть сайт ↗</Link>
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
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
