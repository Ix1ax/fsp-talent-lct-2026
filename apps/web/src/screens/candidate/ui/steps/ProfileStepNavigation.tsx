import { CheckIcon, LoaderCircleIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TabsList,
  TabsTrigger,
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
  const index = PROFILE_STEPS.findIndex((item) => item.id === step);
  return (
    <div className="relative flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <p className="pr-7 text-sm font-medium" aria-live="polite">
        Шаг {index + 1} из {PROFILE_STEPS.length} · {PROFILE_STEPS[index].title}
      </p>
      {busy && (
        <LoaderCircleIcon
          className="absolute top-4 right-4 size-5 animate-spin text-muted-foreground motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
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
      <TabsList
        aria-label="Шаги настройки профиля"
        variant="line"
        className="hidden h-auto! w-full grid-cols-3 gap-2 p-0 sm:grid lg:grid-cols-4"
      >
        {PROFILE_STEPS.map((item, position) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            disabled={busy}
            aria-current={item.id === step ? 'step' : undefined}
            className={cn(
              'min-h-11 min-w-0 gap-1 rounded-md px-2 py-3 text-sm whitespace-normal after:hidden',
              item.id === step && 'bg-accent text-accent-foreground',
            )}
          >
            <span>
              {position + 1}. {item.title}
            </span>
            {savedSteps.includes(item.id) && (
              <CheckIcon
                className="size-4 shrink-0 text-success"
                aria-label="Данные сохранены"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      <p className="text-sm text-muted-foreground">
        Черновик сохраняется при переключении шагов. Чтобы записать данные,
        нажмите «Сохранить».
      </p>
    </div>
  );
};
