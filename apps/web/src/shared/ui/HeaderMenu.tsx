'use client';

import { type MouseEvent, type ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MenuIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { Button } from './Button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './Sheet';

/** Пункты в панели — крупные строки во всю ширину с полной подписью. */
const menuListClassName = cn(
  'grid gap-1',
  '[&>*]:min-h-12 [&>*]:w-full [&>*]:justify-start [&>*]:gap-3 [&>*]:rounded-xl [&>*]:px-3 [&>*]:text-[0.9375rem] [&>*]:text-foreground',
  '[&>*:hover]:bg-muted [&>[aria-current=page]]:bg-accent [&>[aria-current=page]]:text-brand-text [&>[aria-current=page]]:shadow-none',
  "[&_svg:not([class*='size-'])]:size-5 [&_svg]:text-muted-foreground [&>[aria-current=page]_svg]:text-brand-text",
  '[&_[data-label-short]]:hidden',
);

interface HeaderMenuProps {
  /** Классы видимости кнопки, например `xl:hidden`. */
  className?: string;
  /** Рабочие разделы — те же ссылки, что в шапке. */
  nav: ReactNode;
  /** Второстепенные пункты: справочник, тема. */
  extra?: ReactNode;
}

/** Полный список разделов и второстепенные пункты — в панели справа. */
export const HeaderMenu = ({ className, nav, extra }: HeaderMenuProps) => {
  const pathname = usePathname();
  // Панель открыта для конкретного адреса: переход на другую страницу
  // (в том числе клиентский) закрывает её сам.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  const closeOnLink = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as HTMLElement).closest('a');
    if (link && !link.hasAttribute('aria-disabled')) setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn('size-10', className)}
          aria-label="Открыть меню разделов"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(20rem,85vw)] gap-0 border-border pb-[env(safe-area-inset-bottom)] sm:max-w-80"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-lg font-semibold">Разделы</SheetTitle>
          <SheetDescription className="sr-only">
            Навигация по кабинету
          </SheetDescription>
        </SheetHeader>
        <div
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-5"
          onClick={closeOnLink}
        >
          <nav aria-label="Разделы кабинета" className={menuListClassName}>
            {nav}
          </nav>
          {extra && (
            <div
              className={cn(
                menuListClassName,
                'mt-auto border-t border-border pt-3',
              )}
            >
              {extra}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
