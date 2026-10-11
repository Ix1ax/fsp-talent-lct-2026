import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckIcon } from 'lucide-react';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { cn } from '@/shared/lib/utils';

import { PROFILE_STEPS, type ProfileStep } from '../../constants';

interface ProfileStepChipsProps {
  step: ProfileStep;
  busy: boolean;
  savedSteps: ProfileStep[];
  onStepChange: (step: ProfileStep) => void;
}

/**
 * Лента шагов до lg: все разделы видны в одну строку с прокруткой,
 * заполненные отмечены галочкой, текущий прокручивается в зону видимости.
 */
export const ProfileStepChips = ({
  step,
  busy,
  savedSteps,
  onStepChange,
}: ProfileStepChipsProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !current) return;
    // Прокручиваем только ленту, не страницу.
    list.scrollTo({
      left: current.offsetLeft - (list.clientWidth - current.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [step]);

  return (
    <nav aria-label="Разделы профиля" className="-mx-3 sm:-mx-4 lg:hidden">
      <div
        ref={listRef}
        className="flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden"
      >
        {PROFILE_STEPS.map((item, position) => {
          const active = item.id === step;
          const saved = savedSteps.includes(item.id);
          return (
            <Link
              key={item.id}
              href={DYNAMIC_ROUTES.CANDIDATE(item.id)}
              scroll={false}
              onNavigate={(event) => {
                event.preventDefault();
                onStepChange(item.id);
              }}
              aria-current={active ? 'page' : undefined}
              aria-disabled={busy || undefined}
              tabIndex={busy ? -1 : undefined}
              onClick={(event) => {
                if (busy) event.preventDefault();
              }}
              className={cn(
                'flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                active
                  ? 'border-primary/50 bg-accent text-brand-text'
                  : 'border-border hover:bg-accent/70',
                busy && 'cursor-not-allowed opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  saved
                    ? 'bg-success/15 text-success'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {saved ? (
                  <CheckIcon
                    className="size-3.5"
                    aria-label="Данные сохранены"
                  />
                ) : (
                  position + 1
                )}
              </span>
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
