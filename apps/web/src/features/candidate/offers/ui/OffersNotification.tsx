'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BellIcon } from 'lucide-react';

import { STATIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';

import { useNewOffersCount } from '../model';

export const OffersNotification = () => {
  const count = useNewOffersCount();
  const pathname = usePathname();
  const hasNew = count !== null && count > 0;
  const label = hasNew
    ? `Входящие предложения: новых — ${count}`
    : 'Входящие предложения';

  return (
    <Button
      asChild
      variant={hasNew ? 'default' : 'outline'}
      className="relative size-11 shrink-0 p-0 sm:w-auto sm:gap-2 sm:px-3"
    >
      <Link
        href={STATIC_ROUTES.OFFERS}
        aria-label={label}
        title={label}
        aria-current={pathname === STATIC_ROUTES.OFFERS ? 'page' : undefined}
      >
        <BellIcon aria-hidden="true" />
        <span className="hidden sm:inline">Предложения</span>
        {hasNew && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums sm:static sm:border-0 sm:bg-primary-foreground sm:text-primary"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
};
