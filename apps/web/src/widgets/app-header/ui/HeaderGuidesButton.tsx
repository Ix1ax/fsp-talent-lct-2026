import Link from 'next/link';

import { Button } from '@/shared/ui';

import { GUIDES_NAV_ITEM } from '../model';

/** Справочник иконкой в верхней строке шапки ниже lg: вторая строка — для рабочих разделов. */
export const HeaderGuidesButton = () => (
  <Button asChild variant="outline" size="icon" className="lg:hidden">
    <Link
      data-preserve-draft
      href={GUIDES_NAV_ITEM.href}
      aria-label={GUIDES_NAV_ITEM.label}
      title={GUIDES_NAV_ITEM.label}
    >
      <GUIDES_NAV_ITEM.icon aria-hidden="true" />
    </Link>
  </Button>
);
