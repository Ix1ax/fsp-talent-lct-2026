import { ArrowLeftIcon, PlusIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { briefTokenClassName, Button, Skeleton } from '@/shared/ui';
import { AsyncState } from '@/shared/ui/AsyncState';
import type { Catalogs, Skill } from '@/entities/catalog';
import { emptyNeed, NeedActions, NeedEditor } from '@/features/employer-need';
import { MatchTable } from '@/widgets/need-matches';

import type { EmployerGateway } from '../lib/gateway';
import type { EmployerBoard } from '../model/useEmployerBoard';
const EMPTY_STEPS = [
  ['Соберите бриф', 'Роль, навыки, формат и вилка'],
  ['Активируйте', 'Или сохраните черновик'],
  ['Откройте подборку', 'Сравните кандидатов по условиям'],
] as const;

interface EmployerNeedPaneProps {
  board: EmployerBoard;
  catalogs: Catalogs;
  skills: Skill[];
  canWrite: boolean;
  composer: boolean;
  detail: boolean;
  dirty: boolean;
  showMatches: boolean;
  listEmpty: boolean;
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
  skills,
  canWrite,
  composer,
  detail,
  dirty,
  showMatches,
  listEmpty,
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
}: EmployerNeedPaneProps) => (
  <main className={cn('min-w-0 space-y-6', !detail && 'max-md:hidden')}>
    {detail && (
      <Button variant="outline" className="md:hidden" onClick={onBack}>
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
      <Skeleton className="h-96 rounded-xl" />
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
    ) : !detail && listEmpty ? (
      <section className="flex flex-col gap-7 rounded-xl border border-border bg-card p-6 sm:p-10">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="font-mono text-xs tracking-[0.08em] text-brand-text uppercase">
            Первая потребность
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-[2rem] sm:leading-10">
            Опишите, кого ищете, одной фразой
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Бриф собирается из значений справочника — по ним сразу строится
            подборка. Черновик можно сохранить и закончить позже.
          </p>
        </div>
        <p
          aria-hidden="true"
          className="rounded-xl border border-dashed border-input bg-muted px-6 py-5 text-xl leading-[2.6rem]"
        >
          Ищем специалиста{' '}
          <span className={briefTokenClassName(true)}>специализация</span>{' '}
          уровня <span className={briefTokenClassName(true)}>грейд</span>,
          формат — <span className={briefTokenClassName(true)}>формат</span>,
          вилка <span className={briefTokenClassName(true)}>не указана</span>.
        </p>
        <ol className="grid gap-5 text-sm sm:grid-cols-3">
          {EMPTY_STEPS.map(([title, text], index) => (
            <li key={title} className="flex flex-col gap-1">
              <span className="font-mono text-xs text-brand-text">
                0{index + 1}
              </span>
              <span className="font-semibold">{title}</span>
              <span className="text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
        {canWrite && (
          <Button type="button" className="self-start" onClick={onStartCreate}>
            <PlusIcon />
            Создать потребность
          </Button>
        )}
      </section>
    ) : !detail ? (
      <section className="flex flex-col gap-2 rounded-xl border border-dashed border-input p-6 text-muted-foreground sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">
          Выберите потребность в списке
        </h2>
        <p className="text-sm leading-relaxed">
          Откроются бриф и подборка кандидатов по условиям работы.
        </p>
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
