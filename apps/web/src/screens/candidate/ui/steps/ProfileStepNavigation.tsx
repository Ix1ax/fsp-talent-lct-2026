import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';

import { DYNAMIC_ROUTES, STATIC_ROUTES } from '@/shared/contants';
import { useMotionSettings } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui';

import { PROFILE_STEPS, type ProfileStep } from '../../constants';

interface ProfileStepNavigationProps {
  step: ProfileStep;
  busy: boolean;
  savedSteps: ProfileStep[];
  onStepChange: (step: ProfileStep) => void;
}

export const ProfileStepNavigation = ({
  step,
  busy,
  savedSteps,
  onStepChange,
}: ProfileStepNavigationProps) => {
  const { reducedMotion, transition } = useMotionSettings();
  const index = PROFILE_STEPS.findIndex((item) => item.id === step);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Link
        href={STATIC_ROUTES.CANDIDATE}
        className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        Обзор кабинета
      </Link>
      <p className="pr-7 text-sm font-medium" aria-live="polite">
        Шаг {index + 1} из {PROFILE_STEPS.length} · {PROFILE_STEPS[index].title}
      </p>
      <Select
        value={step}
        disabled={busy}
        onValueChange={(next) => {
          const item = PROFILE_STEPS.find((item) => item.id === next);
          if (item) onStepChange(item.id);
        }}
      >
        <SelectTrigger
          className="h-11! w-full sm:hidden"
          aria-label="Перейти к шагу настройки профиля"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROFILE_STEPS.map((item, position) => (
            <SelectItem key={item.id} value={item.id}>
              {position + 1}. {item.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <nav
        aria-label="Разделы профиля"
        className="hidden w-full flex-col gap-1 sm:flex"
      >
        {PROFILE_STEPS.map((item, position) => (
          <Link
            key={item.id}
            href={DYNAMIC_ROUTES.CANDIDATE(item.id)}
            scroll={false}
            onNavigate={(event) => {
              event.preventDefault();
              onStepChange(item.id);
            }}
            aria-current={item.id === step ? 'page' : undefined}
            aria-disabled={busy || undefined}
            tabIndex={busy ? -1 : undefined}
            onClick={(event) => {
              if (busy) event.preventDefault();
            }}
            className={cn(
              'flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md px-3 py-3 text-sm whitespace-normal transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-ring',
              item.id === step && 'bg-accent text-brand-text',
              busy && 'cursor-not-allowed opacity-60',
            )}
          >
            <span>
              {position + 1}. {item.title}
            </span>
            <span className="flex size-4 shrink-0 items-center justify-center">
              <AnimatePresence initial={false}>
                {savedSteps.includes(item.id) && (
                  <motion.span
                    key="saved"
                    className="inline-flex"
                    initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.8 }}
                    transition={transition}
                  >
                    <CheckIcon
                      className="size-4 text-success"
                      aria-label="Данные сохранены"
                    />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">
        Изменения отправляются после нажатия «Сохранить».
      </p>
    </div>
  );
};
