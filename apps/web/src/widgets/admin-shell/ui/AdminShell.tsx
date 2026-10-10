'use client';

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { confirmUnsavedChanges } from '@/shared/hooks';
import { PageTransition } from '@/shared/ui';
import { AdminProvider, useAdminSession } from '@/features/admin';

import { useSidebarCollapsed } from '../model';
import { AdminBackground } from './AdminBackground';
import { AdminSessionState } from './AdminSessionState';
import { AdminShellHeader } from './AdminShellHeader';
import { AdminSidebar } from './AdminSidebar';

interface AdminShellProps {
  children: ReactNode;
}
const Content = ({ children }: AdminShellProps) => {
  const pathname = usePathname();
  const { session, loading, error, retry, logout } = useAdminSession();
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const [exiting, setExiting] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  const exit = async () => {
    if (exiting || !confirmUnsavedChanges()) return;
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

  if (loading || (error && !session) || !session)
    return (
      <AdminSessionState
        loading={loading}
        error={error}
        hasSession={!!session}
        onRetry={retry}
        onReturnToLogin={() => void logout()}
      />
    );

  return (
    <div
      className={`h-dvh overflow-hidden lg:grid ${collapsed ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'}`}
    >
      <AdminSidebar
        admin={session.admin}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        exiting={exiting}
        onLogout={() => void exit()}
      />
      <main
        ref={contentRef}
        className="relative isolate h-dvh min-w-0 overflow-y-auto overscroll-y-contain"
      >
        <AdminBackground />
        <AdminShellHeader exiting={exiting} onLogout={() => void exit()} />
        <div
          key={session.admin.id}
          className="relative z-10 mx-auto w-full max-w-[1440px] p-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pt-4 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:p-8 lg:pt-4"
        >
          <PageTransition
            transitionKey={pathname}
            distance={0}
            className="min-w-0"
          >
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
};

export const AdminShell = ({ children }: AdminShellProps) => (
  <AdminProvider>
    <div data-admin-shell className="relative isolate min-h-screen">
      <div className="relative z-10">
        <Content>{children}</Content>
      </div>
    </div>
  </AdminProvider>
);
