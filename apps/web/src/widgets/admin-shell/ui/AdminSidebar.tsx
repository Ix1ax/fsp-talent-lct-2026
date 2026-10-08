import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  BrandLogo,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui';
import type { AdminAccount } from '@/entities/admin';

import { ADMIN_LINKS } from '../model';

interface AdminSidebarProps {
  admin: AdminAccount;
  collapsed: boolean;
  onToggle: () => void;
  exiting: boolean;
  onLogout: () => void;
}

export const AdminSidebar = ({
  admin,
  collapsed,
  onToggle,
  exiting,
  onLogout,
}: AdminSidebarProps) => {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex min-w-0 flex-col border-t bg-card pb-[env(safe-area-inset-bottom)] lg:sticky lg:inset-auto lg:top-0 lg:z-auto lg:h-dvh lg:overflow-y-auto lg:border-t-0 lg:border-r lg:pb-0">
      <div className="hidden h-16 shrink-0 items-center border-b lg:flex">
        <div className="hidden w-[72px] shrink-0 justify-center lg:flex">
          <Button
            size="icon"
            variant="ghost"
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        <Link
          href="/admin"
          aria-label="ФСП Скаут — админка"
          className={cn('px-6 lg:px-0', collapsed && 'lg:hidden')}
        >
          <BrandLogo />
        </Link>
      </div>
      <div
        className={cn(
          'hidden px-6 pt-6 pb-3 text-xs font-medium text-caption lg:block',
          collapsed && 'lg:invisible',
        )}
      >
        Администрирование
      </div>
      <nav
        aria-label="Разделы админки"
        className={cn(
          'flex justify-around gap-1 p-2 lg:grid lg:p-3 lg:overflow-visible lg:pt-0',
          collapsed && 'lg:px-2',
        )}
      >
        {ADMIN_LINKS.filter(
          (l) => l.path !== 'admins' || admin.role === 'superadmin',
        ).map(({ path, label, mobileLabel, icon: Icon }) => {
          const active =
            pathname === `/admin/${path}` ||
            pathname.startsWith(`/admin/${path}/`) ||
            (path === 'catalogs' && pathname === '/admin');
          return (
            <Tooltip key={path}>
              <TooltipTrigger asChild>
                <Link
                  href={`/admin/${path}`}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 min-w-11 rounded-md shrink-0 flex-col items-center justify-center gap-1 whitespace-nowrap px-2 py-2 text-sm lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-3',
                    active
                      ? 'bg-accent text-brand-text'
                      : 'text-muted-foreground hover:bg-muted',
                    collapsed && 'lg:justify-center lg:px-0',
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="text-[10px] leading-4 lg:hidden">
                    {mobileLabel}
                  </span>
                  <span
                    className={cn(
                      'sr-only lg:not-sr-only',
                      collapsed && 'lg:hidden',
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div
        className={cn(
          'mt-auto hidden shrink-0 border-t p-6 lg:block',
          collapsed && 'lg:p-2',
        )}
      >
        <div className={cn(collapsed && 'lg:hidden')}>
          <p className="truncate text-sm font-medium" title={admin.email}>
            {admin.email}
          </p>
          <p className="mt-1 text-xs text-caption">
            {admin.role === 'superadmin'
              ? 'Главный администратор'
              : 'Администратор'}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'mt-3 px-0',
                collapsed && 'lg:mt-0 lg:w-full lg:justify-center',
              )}
              aria-label="Выйти из админки"
              disabled={exiting}
              onClick={onLogout}
            >
              <LogOut />
              <span className={cn(collapsed && 'lg:hidden')}>Выйти</span>
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Выйти из админки</TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
};
