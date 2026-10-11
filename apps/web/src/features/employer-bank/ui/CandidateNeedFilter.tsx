import { OptionSelect } from '@/shared/ui';
import { type EmployerNeed } from '@/entities/employer-need';

import { CandidateNeedHint } from './CandidateNeedHint';

interface CandidateNeedFilterProps {
  needs: EmployerNeed[];
  needId: string;
  needsLoading: boolean;
  needsError: string;
  busy: boolean;
  onNeed: (id: string) => void;
  onRetryNeeds: () => void;
  onNeeds: () => void;
}
export const CandidateNeedFilter = ({
  needs,
  needId,
  needsLoading,
  needsError,
  busy,
  onNeed,
  onRetryNeeds,
  onNeeds,
}: CandidateNeedFilterProps) => {
  return (
    <div className="grid gap-2 border-b pb-5">
      <label className="grid gap-2 text-sm font-medium">
        Потребность
        <OptionSelect
          aria-label="Потребность для поиска соискателей"
          value={needId}
          disabled={busy || needsLoading || !!needsError}
          onValueChange={onNeed}
          options={[
            {
              value: '',
              label: needsLoading
                ? 'Загружаем потребности…'
                : 'Без привязки к потребности',
            },
            ...needs.map((need) => ({ value: need.id, label: need.title })),
          ]}
        />
      </label>
      <CandidateNeedHint
        needsError={needsError}
        needsLoading={needsLoading}
        needs={needs}
        busy={busy}
        onRetryNeeds={onRetryNeeds}
        onNeeds={onNeeds}
      />
    </div>
  );
};
