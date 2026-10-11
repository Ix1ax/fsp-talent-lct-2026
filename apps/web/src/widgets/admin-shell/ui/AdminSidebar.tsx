import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import {
  DYNAMIC_ROUTES,
  MOTION_LAYOUT_IDS,
  STATIC_ROUTES,
} from '@/shared/contants';
import { cn } from '@/shared/lib/utils';
import {
  AnimatedIndicator,
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
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [pathname]);
  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 flex min-w-0 flex-col border-t bg-card pb-[env(safe-area-inset-bottom)] lg:sticky lg:inset-auto lg:top-0 lg:h-dvh lg:border-t-0 lg:border-r lg:pb-0">
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
        <div
          className={cn(
            'hidden h-16 shrink-0 items-center border-b px-6 lg:flex',
            collapsed && 'justify-center px-0',
          )}
        >
          <Link
            href={STATIC_ROUTES.ADMIN}
            aria-label="ФСП Скаут — админка"
            className="inline-flex min-h-11 min-w-11 items-center justify-center"
          >
            <BrandLogo compact={collapsed} />
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
          ref={navRef}
          aria-label="Разделы админки"
          className={cn(
            'grid grid-flow-col auto-cols-[80px] gap-1 overflow-x-auto p-2 lg:grid-flow-row lg:auto-cols-auto lg:overflow-x-visible lg:p-3 lg:pt-0',
            collapsed && 'lg:px-2',
          )}
        >
          {ADMIN_LINKS.filter(
            (l) => l.path !== 'admins' || admin.role === 'superadmin',
          ).map(({ path, label, mobileLabel, icon: Icon }) => {
            const active =
              pathname === DYNAMIC_ROUTES.ADMIN(path) ||
              pathname.startsWith(`${DYNAMIC_ROUTES.ADMIN(path)}/`) ||
              (path === 'overview' && pathname === STATIC_ROUTES.ADMIN);
            return (
              <Tooltip key={path}>
                <TooltipTrigger asChild>
                  <Link
                    href={DYNAMIC_ROUTES.ADMIN(path)}
                    aria-label={label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative isolate flex min-h-14 min-w-0 rounded-lg flex-col items-center justify-center gap-1 whitespace-nowrap px-0.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-3',
                      active
                        ? 'text-brand-text'
                        : 'text-muted-foreground hover:bg-muted',
                      collapsed && 'lg:justify-center lg:px-0',
                    )}
                  >
                    {active && (
                      <AnimatedIndicator
                        layoutId={MOTION_LAYOUT_IDS.ADMIN_SIDEBAR_ACTIVE}
                        className="absolute inset-0 -z-10 rounded-lg bg-accent"
                      />
                    )}
                    <Icon size={18} className="shrink-0" />
                    <span className="max-w-full truncate text-[10px] leading-4 lg:hidden">
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
                {/* Подсказка нужна только свёрнутому меню: иначе подпись видна. */}
                {collapsed && (
                  <TooltipContent side="right" className="max-lg:hidden">
                    {label}
                  </TooltipContent>
                )}
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
                  'mt-3 min-h-11 px-0',
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
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="absolute -right-5.5 bottom-24 z-40 hidden size-11 rounded-full bg-card lg:inline-flex"
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            aria-expanded={!collapsed}
            onClick={onToggle}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        </TooltipContent>
      </Tooltip>
    </aside>
  );
};
