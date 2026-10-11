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
    <Button asChild variant="outline" size="icon" className="relative shrink-0">
      <Link
        href={STATIC_ROUTES.OFFERS}
        aria-label={label}
        title={label}
        aria-current={pathname === STATIC_ROUTES.OFFERS ? 'page' : undefined}
      >
        <BellIcon aria-hidden="true" />
        {hasNew && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full border-2 border-card bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
};
