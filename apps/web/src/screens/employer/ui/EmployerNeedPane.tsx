import { ArrowLeftIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button, Skeleton } from '@/shared/ui';
import { AsyncState } from '@/shared/ui/AsyncState';
import type { Catalogs, Skill } from '@/entities/catalog';
import { emptyNeed, NeedActions, NeedEditor } from '@/features/employer-need';
import { MatchTable } from '@/widgets/need-matches';

import type { EmployerGateway } from '../lib/gateway';
import type { EmployerBoard } from '../model/useEmployerBoard';
interface EmployerNeedPaneProps {
  board: EmployerBoard;
  catalogs: Catalogs;
  skills: Skill[];
  canWrite: boolean;
  composer: boolean;
  detail: boolean;
  dirty: boolean;
  showMatches: boolean;
  loadRecommendations?: EmployerGateway['recommendations'];
  onDirtyChange: (dirty: boolean) => void;
  onCreated: (active: boolean) => void;
  onSaved: () => void;
  onCancelCreate: () => void;
  onBack: () => void;
  onFind: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
}
export const EmployerNeedPane = ({
  board,
  catalogs,
  skills,
  canWrite,
  composer,
  detail,
  dirty,
  showMatches,
  loadRecommendations,
  onDirtyChange,
  onCreated,
  onSaved,
  onCancelCreate,
  onBack,
  onFind,
  onArchive,
  onDuplicate,
}: EmployerNeedPaneProps) => (
  <main
    className={cn(
      'min-w-0 space-y-5 pb-6 md:p-6 xl:px-8',
      !detail && 'max-md:hidden',
    )}
  >
    {detail && (
      <Button
        variant="ghost"
        className="h-12 w-full justify-start border-b border-border bg-card md:hidden"
        onClick={onBack}
      >
        <ArrowLeftIcon />
        Потребности
      </Button>
    )}
    {composer ? (
      <NeedEditor
        key="new"
        initial={emptyNeed()}
        isNew
        catalogs={catalogs}
        skills={skills}
        pending={board.pending}
        error={board.saveError}
        onSave={async (value) => {
          await board.save(value, true);
          onCreated(value.status === 'active');
        }}
        onCancel={onCancelCreate}
        onDirtyChange={onDirtyChange}
      />
    ) : board.detailLoading && detail ? (
      <Skeleton className="h-96 rounded-none" />
    ) : board.selected ? (
      <>
        <NeedEditor
          key={`${board.selected.id}-${board.revision}`}
          initial={board.selected}
          footer={
            <NeedActions
              status={board.selected.status}
              canWrite={canWrite}
              pending={board.pending}
              dirty={dirty}
              onFind={onFind}
              onRestore={() => {
                void board.restore().catch(() => {});
              }}
              onArchive={onArchive}
              onDuplicate={onDuplicate}
            />
          }
          catalogs={catalogs}
          skills={skills}
          readonly={!canWrite || board.selected.status === 'archived'}
          pending={board.pending}
          error={board.saveError}
          onSave={async (value) => {
            await board.save(value, false);
            onSaved();
          }}
          onCancel={() => {}}
          onDirtyChange={onDirtyChange}
        />
        {board.selected.status === 'active' && showMatches && (
          <MatchTable
            key={`matches-${board.selected.id}-${board.revision}`}
            companyId={board.companyId}
            needId={board.selected.id}
            catalogs={catalogs}
            load={loadRecommendations}
          />
        )}
        {board.selected.status === 'draft' && (
          <AsyncState
            title="Подборка появится после активации"
            description="Для активной потребности нужны название, описание, специализация, хотя бы один навык и формат работы."
          />
        )}
      </>
    ) : !detail ? (
      <AsyncState
        className="min-h-80"
        title="Выберите потребность"
        description="Слева — список. Здесь появятся бриф и подборка по условиям работы."
      />
    ) : board.detailError || board.listError ? (
      <AsyncState
        error
        title="Потребность недоступна"
        description={board.detailError || board.listError}
        onRetry={board.reload}
      />
    ) : null}
  </main>
);
