import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';

import { Button } from '@/shared/ui';

import { PROFILE_STEPS, type ProfileStep } from '../../constants';

interface ProfileStepActionsProps {
  step: ProfileStep;
  busy: boolean;
  processing: boolean;
  profileExists: boolean;
  onStepChange: (step: ProfileStep) => void;
}

export const ProfileStepActions = ({
  step,
  busy,
  processing,
  profileExists,
  onStepChange,
}: ProfileStepActionsProps) => {
  const index = PROFILE_STEPS.findIndex((item) => item.id === step);
  const previous = PROFILE_STEPS[index - 1];
  const next = PROFILE_STEPS[index + 1];
  const isFormStep = [
    'profile',
    'contacts',
    'experience',
    'education',
  ].includes(step);

  let label = 'Продолжить без сохранения';
  if (step === 'consents') label = 'Перейти к профилю';
  if (step === 'skills') label = 'Проверить готовность';

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex flex-wrap justify-between gap-3">
        {previous && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={busy}
            onClick={() => onStepChange(previous.id)}
          >
            <ArrowLeftIcon />
            Назад
          </Button>
        )}
        {next && (
          <Button
            type="button"
            variant={isFormStep ? 'outline' : 'default'}
            size="lg"
            disabled={
              busy || (step === 'consents' && !processing && !profileExists)
            }
            className="ml-auto w-full sm:w-auto"
            onClick={() => onStepChange(next.id)}
          >
            {label}
            <ArrowRightIcon />
          </Button>
        )}
      </div>
      {step === 'consents' && (
        <p className="text-sm text-muted-foreground">
          {profileExists
            ? 'Опыт и образование доступны в следующих шагах. Согласия на обработку и публикацию можно изменить здесь.'
            : 'Для создания профиля нужно согласие на обработку данных. Публикацию можно разрешить позже.'}
        </p>
      )}
      {isFormStep && (
        <p className="text-sm text-muted-foreground">
          «Продолжить без сохранения» оставит изменения в черновике этой
          страницы.
        </p>
      )}
    </div>
  );
};
