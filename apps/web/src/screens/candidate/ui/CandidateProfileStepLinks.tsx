import { useRemoteData } from '@/shared/hooks';
import { RemoteState, Stagger } from '@/shared/ui';

import { PROFILE_STEPS } from '../constants';
import { loadProfileStepStatuses } from '../model';
import { ProfileStepItem } from './ProfileStepItem';

export const CandidateProfileStepLinks = () => {
  const query = useRemoteData(loadProfileStepStatuses);

  const getStatus = (id: (typeof PROFILE_STEPS)[number]['id']) => {
    if (query.loading) return 'Проверяем…';
    if (query.error || query.data?.unavailableSteps.includes(id)) {
      return 'Статус недоступен';
    }

    return query.data?.savedSteps.includes(id) ? 'Заполнено' : 'Не заполнено';
  };

  return (
    <nav aria-label="Разделы профиля">
      {query.error && (
        <RemoteState loading={false} error={query.error} retry={query.retry} />
      )}
      {!!query.data?.unavailableSteps.length && (
        <RemoteState
          loading={false}
          error="Не удалось проверить часть разделов. Остальные статусы актуальны."
          retry={query.retry}
        />
      )}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILE_STEPS.map((step, index) => (
          <ProfileStepItem
            key={step.id}
            step={step}
            number={index + 1}
            status={getStatus(step.id)}
          />
        ))}
      </Stagger>
    </nav>
  );
};
