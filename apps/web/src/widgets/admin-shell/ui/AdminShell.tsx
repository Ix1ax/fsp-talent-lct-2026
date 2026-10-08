'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';
import {
  AdminLoginForm,
  AdminProvider,
  ErrorNotice,
  useAdminSession,
} from '@/features/admin';

import { useSidebarCollapsed } from '../model';
import { AdminBackground } from './AdminBackground';
import { AdminSidebar } from './AdminSidebar';

interface AdminShellProps {
  children: ReactNode;
}
const Content = ({ children }: AdminShellProps) => {
  const { session, loading, error, retry, logout } = useAdminSession();
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const [exiting, setExiting] = useState(false);
  if (loading)
    return (
      <div
        className="grid min-h-screen place-items-center text-muted-foreground"
        role="status"
      >
        Проверяем сессию…
      </div>
    );
  if (error && !session)
    return (
      <div className="mx-auto grid max-w-lg gap-4 p-8">
        <ErrorNotice error={error} />
        <Button onClick={retry}>Повторить проверку сессии</Button>
        <Button variant="outline" onClick={() => void logout()}>
          Перейти ко входу
        </Button>
      </div>
    );
  if (!session) return <AdminLoginForm />;
  const exit = async () => {
    setExiting(true);
    try {
      await logout();
    } catch {
      toast.error(
        'Локальный выход выполнен. Сервер не подтвердил отзыв сессии.',
      );
    } finally {
      setExiting(false);
    }
  };
  return (
    <div
      className={`min-h-screen motion-safe:transition-[grid-template-columns] motion-safe:duration-200 lg:grid ${collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'}`}
    >
      <AdminSidebar
        admin={session.admin}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        exiting={exiting}
        onLogout={() => void exit()}
      />
      <main className="relative isolate min-w-0">
        <header className="sticky top-0 z-20 border-b bg-card lg:relative">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                aria-label="ФСП Скаут — админка"
                className="lg:hidden"
              >
                <BrandLogo compact />
              </Link>
              <span className="hidden text-sm text-muted-foreground lg:inline">
                <span className="hidden sm:inline">Платформа / </span>Админка
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
                onClick={() => void exit()}
              >
                <LogOut />
              </Button>
            </div>
          </div>
        </header>
        <div
          key={session.admin.id}
          className="relative z-10 mx-auto w-full max-w-7xl p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:p-8"
        >
          {children}
        </div>
      </main>
    </div>
  );
};
export const AdminShell = ({ children }: AdminShellProps) => (
  <AdminProvider>
    <div data-admin-shell className="relative isolate min-h-screen">
      <AdminBackground />
      <div className="relative z-10">
        <Content>{children}</Content>
      </div>
    </div>
  </AdminProvider>
);
