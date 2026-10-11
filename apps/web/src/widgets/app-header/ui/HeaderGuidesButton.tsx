import Link from 'next/link';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';

import { GUIDES_NAV_ITEM } from '../model';

interface HeaderGuidesButtonProps {
  /** Подпись рядом с иконкой с sm — для гостей, у которых других разделов нет. */
  labeled?: boolean;
  className?: string;
}

/** Справочник — второстепенный раздел, поэтому живёт в действиях шапки, а не среди рабочих. */
export const HeaderGuidesButton = ({
  labeled = false,
  className,
}: HeaderGuidesButtonProps) => {
  return (
    <Button
      asChild
      variant="ghost"
      size={labeled ? 'default' : 'icon'}
      className={cn(
        labeled ? 'h-10 max-sm:w-10 max-sm:px-0' : 'size-10',
        className,
      )}
    >
      <Link
        data-preserve-draft
        href={GUIDES_NAV_ITEM.href}
        aria-label={GUIDES_NAV_ITEM.label}
        title={GUIDES_NAV_ITEM.label}
      >
        <GUIDES_NAV_ITEM.icon aria-hidden="true" />
        {labeled && (
          <span className="max-sm:hidden">{GUIDES_NAV_ITEM.label}</span>
        )}
      </Link>
    </Button>
  );
};
