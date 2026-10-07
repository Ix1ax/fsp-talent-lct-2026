import { cn } from '@/shared/lib/utils';
import { TabsList, TabsTrigger } from '@/shared/ui';

import { PROFILE_STEPS, type ProfileStep } from '../../constants';

interface ProfileStepNavigationProps {
  step: ProfileStep;
  busy: boolean;
  savedSteps: ProfileStep[];
}

export const ProfileStepNavigation = ({
  step,
  busy,
  savedSteps,
}: ProfileStepNavigationProps) => {
  const index = PROFILE_STEPS.findIndex((item) => item.id === step);
  return (
    <footer className="mt-auto flex min-w-0 shrink-0 flex-col gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Шаг {index + 1} из {PROFILE_STEPS.length}
      </p>
      <TabsList
        aria-label="Шаги настройки профиля"
        variant="line"
        className="grid h-auto! w-full grid-cols-5 items-start gap-2 p-0"
      >
        {PROFILE_STEPS.map((item, position) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            disabled={busy}
            aria-current={item.id === step ? 'step' : undefined}
            className="h-auto min-w-0 flex-col gap-2 whitespace-normal rounded-none p-0 pb-2 after:hidden"
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-2 w-full rounded-full bg-muted',
                savedSteps.includes(item.id) && 'bg-primary',
                item.id === step &&
                  'ring-2 ring-ring ring-offset-2 ring-offset-background',
              )}
            />
            <span className="text-center text-xs sm:text-sm">
              {position + 1}. {item.title}
              <span className="sr-only">
                {savedSteps.includes(item.id)
                  ? ' — данные сохранены'
                  : ' — нет сохранённых данных'}
              </span>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      <p className="text-xs text-muted-foreground">
        Заполненные сегменты означают сохранённые данные; рамка отмечает текущий
        шаг. Выберите любой шаг, чтобы перейти к нему или пропустить текущий.
        Переход не сохраняет изменения. Черновики сохраняются, пока эта страница
        открыта.
      </p>
    </footer>
  );
};
