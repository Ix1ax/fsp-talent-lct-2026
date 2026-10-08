'use client';

import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import { AdminProvider, useAdminSession } from '@/features/admin';

import { useSidebarCollapsed } from '../model';
import { AdminSessionState } from './AdminSessionState';
import { AdminShellHeader } from './AdminShellHeader';
import { AdminSidebar } from './AdminSidebar';

interface AdminShellProps {
  children: ReactNode;
}
const Content = ({ children }: AdminShellProps) => {
  const { session, loading, error, retry, logout } = useAdminSession();
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const [exiting, setExiting] = useState(false);

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
        <AdminShellHeader exiting={exiting} onLogout={() => void exit()} />
        <div
          key={session.admin.id}
          className="relative z-10 mx-auto w-full max-w-[1440px] p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:p-8"
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
      <div className="relative z-10">
        <Content>{children}</Content>
      </div>
    </div>
  </AdminProvider>
);
