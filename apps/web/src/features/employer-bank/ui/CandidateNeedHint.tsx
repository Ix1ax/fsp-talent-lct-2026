import { Button } from '@/shared/ui';
import type { EmployerNeed } from '@/entities/employer-need';

interface CandidateNeedHintProps {
  needs: EmployerNeed[];
  needsLoading: boolean;
  needsError: string;
  busy: boolean;
  onNeeds: () => void;
  onRetryNeeds: () => void;
}

export const CandidateNeedHint = ({
  needsError,
  needsLoading,
  needs,
  busy,
  onRetryNeeds,
  onNeeds,
}: CandidateNeedHintProps) => {
  if (needsError) {
    return (
      <>
        <p role="alert" className="text-xs text-destructive">
          {needsError}
        </p>
        <Button
          variant="link"
          size="sm"
          disabled={busy}
          onClick={onRetryNeeds}
          className="justify-self-start p-0"
        >
          Повторить загрузку
        </Button>
      </>
    );
  }

  if (!needsLoading && !needs.length) {
    return (
      <>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Для подбора по требованиям нужна активная потребность.
        </p>
        <Button
          variant="link"
          size="sm"
          disabled={busy}
          onClick={onNeeds}
          className="justify-self-start p-0 text-brand-text"
        >
          Потребности компании
        </Button>
      </>
    );
  }

  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Изменение фильтров снимает привязку. Верните условия выбранной потребности
      — привязка восстановится.
    </p>
  );
};
