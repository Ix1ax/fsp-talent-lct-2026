import { useRef, useState } from 'react';
import { ArrowLeftIcon, FileTextIcon, UsersIcon } from 'lucide-react';

import { AsyncState, Badge, Button, SectionTabs } from '@/shared/ui';
import { formatSalaryRange } from '@/shared/utils';
import type { Catalogs, Skill } from '@/entities/catalog';
import {
  type EmployerNeed,
  NEED_DETAIL_STATUS_LABELS,
  type NeedInput,
  type Recommendation,
} from '@/entities/employer-need';
import {
  NeedActions,
  NeedFlowEditor,
  NeedSummary,
} from '@/features/employer-need';
import { MatchTable } from '@/widgets/need-matches';

type NeedView = 'candidates' | 'brief';

interface NeedDetailProps {
  need: EmployerNeed;
  companyId: string;
  catalogs: Catalogs;
  skills: Skill[];
  active: boolean;
  /** Только что создана: открыть бриф на втором шаге. */
  created: boolean;
  canWrite: boolean;
  pending: boolean;
  dirty: boolean;
  revision: number;
  saveError: string;
  loadRecommendations: Parameters<typeof MatchTable>[0]['load'];
  onSave: (value: NeedInput) => Promise<void>;
  onBack: () => void;
  onDirtyChange: (value: boolean) => void;
  onCandidate: (id: string, recommendation?: Recommendation) => void;
  onRestore: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
}

const defaultView = (need: EmployerNeed, created: boolean): NeedView =>
  need.status === 'active' && !created ? 'candidates' : 'brief';

/**
 * Экран потребности: сводка и главное действие сверху,
 * ниже вкладки «Кандидаты» (подбор) и «Бриф» (условия и редактирование).
 */
export const NeedDetail = ({
  need,
  companyId,
  catalogs,
  skills,
  active,
  created,
  canWrite,
  pending,
  dirty,
  revision,
  saveError,
  loadRecommendations,
  onSave,
  onBack,
  onDirtyChange,
  onCandidate,
  onRestore,
  onArchive,
  onDuplicate,
}: NeedDetailProps) => {
  const [view, setView] = useState<NeedView>(() => defaultView(need, created));
  const readonly = !canWrite || need.status === 'archived';
  const tabsRef = useRef<HTMLDivElement>(null);
  const openView = (next: NeedView) => {
    setView(next);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="grid min-w-0 gap-5">
      <Button
        variant="ghost"
        className="justify-self-start"
        disabled={pending}
        onClick={onBack}
      >
        <ArrowLeftIcon />
        Все потребности
      </Button>
      <section
        aria-label="Сводка потребности"
        className="grid min-w-0 gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6"
      >
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={need.status === 'active' ? 'success' : 'outline'}
                className="rounded-md"
              >
                {NEED_DETAIL_STATUS_LABELS[need.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                от {new Date(need.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
              {need.title}
            </h2>
            <p className="text-base font-semibold">
              {formatSalaryRange(need.salaryFromRub, need.salaryToRub)}
            </p>
          </div>
          <NeedActions
            status={need.status}
            canWrite={canWrite}
            pending={pending}
            dirty={dirty}
            onFind={() => openView('candidates')}
            onEditBrief={() => openView('brief')}
            onRestore={onRestore}
            onArchive={onArchive}
            onDuplicate={onDuplicate}
          />
        </div>
        <NeedSummary value={need} catalogs={catalogs} skills={skills} />
      </section>
      <div ref={tabsRef} className="scroll-mt-40 lg:scroll-mt-28">
        <SectionTabs
          label="Разделы потребности"
          value={view}
          onValueChange={setView}
          items={[
            { value: 'candidates', label: 'Кандидаты', icon: UsersIcon },
            {
              value: 'brief',
              label: readonly ? 'Бриф' : 'Бриф и условия',
              icon: FileTextIcon,
            },
          ]}
        />
      </div>
      <div role="tabpanel" hidden={view !== 'candidates'} className="min-w-0">
        {need.status === 'active' ? (
          <MatchTable
            key={`${need.id}-${revision}`}
            companyId={companyId}
            needId={need.id}
            catalogs={catalogs}
            load={loadRecommendations}
            onOpenCandidate={onCandidate}
          />
        ) : (
          <div className="grid gap-3">
            <AsyncState
              title={
                need.status === 'draft'
                  ? 'Подбор появится после активации'
                  : 'Потребность в архиве'
              }
              description={
                need.status === 'draft'
                  ? 'Добавьте навыки и форматы работы, затем активируйте потребность на шаге «Готовность».'
                  : 'Верните её в черновики, чтобы снова подбирать кандидатов.'
              }
            />
            {need.status === 'draft' && canWrite && (
              <Button
                variant="outline"
                className="justify-self-center"
                onClick={() => setView('brief')}
              >
                Открыть бриф
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Бриф остаётся смонтированным, чтобы не терять несохранённые правки. */}
      <div role="tabpanel" hidden={view !== 'brief'} className="min-w-0">
        <NeedFlowEditor
          active={active && view === 'brief'}
          key={`${need.id}-${need.status === 'archived'}`}
          initial={need}
          initialStep={created ? 1 : 0}
          catalogs={catalogs}
          skills={skills}
          readonly={readonly}
          pending={pending}
          error={saveError}
          onSave={onSave}
          onBack={onBack}
          onDirtyChange={onDirtyChange}
          showBack={false}
        />
      </div>
      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}
    </div>
  );
};
