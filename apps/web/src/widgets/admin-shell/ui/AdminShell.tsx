'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  FileQuestion,
  Layers,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { BrandLogo, Button, ThemeToggle } from '@/shared/ui';
import {
  AdminLoginForm,
  AdminProvider,
  ErrorNotice,
  useAdminSession,
} from '@/features/admin';

interface AdminShellProps {
  children: ReactNode;
}
const links = [
  { path: 'catalogs', label: 'Справочники', icon: BookOpen },
  { path: 'moderation', label: 'Модерация навыков', icon: ShieldCheck },
  { path: 'questions', label: 'Банк заданий', icon: FileQuestion },
  { path: 'templates', label: 'Шаблоны тестов', icon: Layers },
  { path: 'admins', label: 'Администраторы', icon: Users },
];
const Content = ({ children }: AdminShellProps) => {
  const { session, loading, error, retry, logout } = useAdminSession();
  const pathname = usePathname();
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
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex min-w-0 flex-col border-b bg-card lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex h-16 shrink-0 items-center border-b px-6">
          <Link href="/admin">
            <BrandLogo />
          </Link>
        </div>
        <div className="hidden px-6 pt-6 pb-3 text-xs uppercase tracking-widest text-caption lg:block">
          Администрирование
        </div>
        <nav
          aria-label="Разделы админки"
          className="flex gap-1 overflow-x-auto p-3 lg:grid lg:overflow-visible lg:pt-0"
        >
          {links
            .filter(
              (l) => l.path !== 'admins' || session.admin.role === 'superadmin',
            )
            .map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                href={`/admin/${path}`}
                aria-current={
                  pathname === `/admin/${path}` ||
                  (path === 'catalogs' && pathname === '/admin')
                    ? 'page'
                    : undefined
                }
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap px-3 py-3 text-sm ${pathname === `/admin/${path}` || (path === 'catalogs' && pathname === '/admin') ? 'bg-accent text-brand-text' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
        </nav>
        <div className="mt-auto hidden shrink-0 border-t p-6 lg:block">
          <p
            className="truncate text-sm font-medium"
            title={session.admin.email}
          >
            {session.admin.email}
          </p>
          <p className="mt-1 text-xs text-caption">
            {session.admin.role === 'superadmin'
              ? 'Главный администратор'
              : 'Администратор'}
          </p>
          <Button
            variant="ghost"
            className="mt-3 px-0"
            disabled={exiting}
            onClick={() => void exit()}
          >
            <LogOut />
            Выйти
          </Button>
        </div>
      </aside>
      <main className="min-w-0">
        <header className="border-b bg-card">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
            <span className="text-sm text-muted-foreground">
              Платформа / Админка
            </span>
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
          className="mx-auto w-full max-w-7xl p-5 lg:p-8"
        >
          {children}
        </div>
      </main>
    </div>
  );
};
export const AdminShell = ({ children }: AdminShellProps) => (
  <AdminProvider>
    <Content>{children}</Content>
  </AdminProvider>
);
