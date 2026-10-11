import { ArrowLeftIcon } from 'lucide-react';

import { getApiErrorMessage } from '@/shared/api';
import { AsyncState, Button, Skeleton, toast } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import { emptyNeed, NeedFlowEditor } from '@/features/employer-need';

import type { EmployerGateway } from '../lib';
import type { EmployerBoard } from '../model';
import { NeedDetail } from './NeedDetail';

interface VacancyDetailContentProps {
  board: EmployerBoard;
  api: EmployerGateway;
  catalogs: Catalogs;
  skills: Skill[];
  composer: boolean;
  created?: boolean;
  dirty: boolean;
  onArchiveConfirm: (value: boolean) => void;
  onBack: () => void;
  onDirtyChange: (value: boolean) => void;
  onCreated: () => void;
  onCandidate: (id: string) => void;
  guard: (action: () => void) => void;
  active: boolean;
  need: EmployerBoard['selected'];
  canWrite: boolean;
}

export const VacancyDetailContent = ({
  board,
  active,
  catalogs,
  skills,
  composer,
  created,
  dirty,
  api,
  onCreated,
  onBack,
  onDirtyChange,
  onCandidate,
  onArchiveConfirm,
  guard,
  need,
  canWrite,
}: VacancyDetailContentProps) => {
  if (composer) {
    return (
      <NeedFlowEditor
        active={active}
        key="new"
        initial={emptyNeed()}
        isNew
        catalogs={catalogs}
        skills={skills}
        pending={board.pending}
        error={board.saveError}
        onSave={async (input) => {
          await board.save(input, true);
          onCreated();
        }}
        onBack={onBack}
        onDirtyChange={onDirtyChange}
      />
    );
  }

  if (board.detailLoading) {
    return <Skeleton className="h-96" />;
  }

  if (board.detailError) {
    return (
      <>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />К списку потребностей
        </Button>
        <AsyncState
          error
          title="Потребность недоступна"
          description={board.detailError}
          onRetry={board.reload}
        />
      </>
    );
  }

  if (need) {
    return (
      <NeedDetail
        key={need.id}
        need={need}
        companyId={board.companyId}
        catalogs={catalogs}
        skills={skills}
        active={active}
        created={!!created}
        canWrite={canWrite}
        pending={board.pending}
        dirty={dirty}
        revision={board.revision}
        saveError={board.saveError}
        loadRecommendations={api.recommendations}
        onSave={(value) => board.save(value, false)}
        onBack={onBack}
        onDirtyChange={onDirtyChange}
        onCandidate={onCandidate}
        onRestore={() =>
          void board.restore().catch((error: unknown) => {
            toast.error(getApiErrorMessage(error));
          })
        }
        onArchive={() => onArchiveConfirm(true)}
        onDuplicate={() =>
          guard(() => {
            void board.duplicate().catch((error: unknown) => {
              toast.error(getApiErrorMessage(error));
            });
          })
        }
      />
    );
  }

  return null;
};
