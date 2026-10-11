import { type RefObject } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button, OptionSelect } from '@/shared/ui';

const STEPS = [
  { id: 'brief', title: 'Бриф' },
  { id: 'conditions', title: 'Задачи и условия' },
  { id: 'readiness', title: 'Готовность' },
] as const;
interface NeedStepNavigationProps {
  stepNavigationRef: RefObject<HTMLDivElement | null>;
  step: number;
  pending: boolean;
  setStep: (step: number) => void;
}
export const NeedStepNavigation = ({
  stepNavigationRef,
  step,
  pending,
  setStep,
}: NeedStepNavigationProps) => {
  return (
    <div
      ref={stepNavigationRef}
      className="flex scroll-mt-40 flex-col lg:scroll-mt-24 gap-3"
    >
      <p className="text-sm font-medium" aria-live="polite">
        Шаг {step + 1} из {STEPS.length} · {STEPS[step].title}
      </p>
      <OptionSelect
        aria-label="Перейти к шагу потребности"
        className="sm:hidden"
        disabled={pending}
        value={step}
        onValueChange={(value) => setStep(Number(value))}
        options={STEPS.map((item, i) => ({
          value: i,
          label: `${i + 1}. ${item.title}`,
        }))}
      />
      <nav
        aria-label="Разделы потребности"
        className="hidden w-fit gap-1 rounded-lg bg-hover p-1 sm:flex"
      >
        {STEPS.map((item, i) => (
          <Button
            type="button"
            key={item.id}
            variant="ghost"
            disabled={pending}
            aria-current={step === i ? 'step' : undefined}
            size="sm"
            className={cn(
              'rounded-md px-3 text-muted-foreground hover:bg-transparent hover:text-foreground',
              step === i &&
                'bg-card text-foreground ring-1 ring-border hover:bg-card',
            )}
            onClick={() => setStep(i)}
          >
            {i + 1}. {item.title}
          </Button>
        ))}
      </nav>
    </div>
  );
};
