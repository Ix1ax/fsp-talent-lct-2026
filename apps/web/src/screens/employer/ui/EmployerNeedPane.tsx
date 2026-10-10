import { ArrowLeftIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button, Skeleton } from '@/shared/ui';
import { AsyncState } from '@/shared/ui/AsyncState';
import type { Catalogs } from '@/entities/catalog';
import { emptyNeed, NeedActions, NeedEditor } from '@/features/employer-need';
import { MatchTable } from '@/widgets/need-matches';

import type { EmployerGateway } from '../lib/gateway';
import type { EmployerBoard } from '../model';

interface EmployerNeedPaneProps {
  board: EmployerBoard;
  catalogs: Catalogs;
  loadSkills: EmployerGateway['skills'];
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
  onStartCreate: () => void;
}

export const EmployerNeedPane = ({
  board,
  catalogs,
  loadSkills,
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
  onStartCreate,
}: EmployerNeedPaneProps) => {
  return (
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
          catalogsLoading={board.catalogsLoading}
          catalogsError={board.catalogsError}
          onRetryCatalogs={board.retryCatalogs}
          catalogs={catalogs}
          loadSkills={loadSkills}
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
            catalogsLoading={board.catalogsLoading}
            catalogsError={board.catalogsError}
            onRetryCatalogs={board.retryCatalogs}
            catalogs={catalogs}
            loadSkills={loadSkills}
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
        <section className="mx-auto my-8 max-w-xl space-y-5 rounded-lg border border-border bg-card p-6 sm:my-16 sm:p-8">
          <h2 className="text-2xl font-semibold">Кого ищем в команду?</h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Выберите потребность в списке, чтобы посмотреть условия и подборку
            кандидатов.
          </p>
          <ol className="grid gap-4 border-y border-border py-5 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">
                1. Опишите роль
              </span>
              <br />
              Задачи, навыки и условия работы.
            </li>
            <li>
              <span className="font-medium text-foreground">
                2. Активируйте потребность
              </span>
              <br />
              Черновик можно сохранить и закончить позже.
            </li>
            <li>
              <span className="font-medium text-foreground">
                3. Откройте подборку
              </span>
              <br />
              Сравните кандидатов по требованиям команды.
            </li>
          </ol>
          {canWrite && (
            <Button type="button" size="lg" onClick={onStartCreate}>
              Создать потребность
            </Button>
          )}
        </section>
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
};
