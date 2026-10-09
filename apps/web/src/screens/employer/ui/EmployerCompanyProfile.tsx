import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRightIcon, PencilIcon } from 'lucide-react';

import { useUnsavedGuard } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, ConfirmDiscardDialog } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company, CompanyInput } from '@/entities/company';
import type { EmployerNeed } from '@/entities/employer-need';
import { CompanyProfileForm } from '@/features/company';

import type { EmployerGateway } from '../lib/gateway';
import { CompanyProfileSummary } from './CompanyProfileSummary';
import { CompanyProfileVacancies } from './CompanyProfileVacancies';

interface EmployerCompanyProfileProps {
  company: Company;
  api: EmployerGateway;
  catalogs: Catalogs;
  skills: Skill[];
  revision: number;
  visible: boolean;
  busy: boolean;
  error: string;
  dirty: boolean;
  onDirtyChange: (value: boolean) => void;
  onSave: (input: CompanyInput, create: boolean) => Promise<Company>;
  onEdit: () => void;
  onCompanies: () => void;
  onTeam: () => void;
  onDocuments: () => void;
  onVacancies: () => void;
  onOpenNeed: (need: EmployerNeed) => void;
}
export const EmployerCompanyProfile = ({
  company,
  api,
  catalogs,
  skills,
  revision,
  visible,
  busy,
  error,
  dirty,
  onDirtyChange,
  onSave,
  onEdit,
  onCompanies,
  onTeam,
  onDocuments,
  onVacancies,
  onOpenNeed,
}: EmployerCompanyProfileProps) => {
  const [editing, setEditing] = useState(false);
  const unsaved = useUnsavedGuard(dirty, busy);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousEditing = useRef(editing);
  useLayoutEffect(() => {
    if (previousEditing.current === editing) return;
    previousEditing.current = editing;
    if (visible)
      contentRef.current?.scrollIntoView({
        behavior: 'instant',
        block: 'start',
      });
  }, [editing, visible]);
  const finish = () => {
    onDirtyChange(false);
    setEditing(false);
  };
  const canEdit = company.memberRole === 'owner';
  return (
    <div
      ref={contentRef}
      className="grid min-w-0 scroll-mt-40 items-start gap-5 md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-[auto_1fr] lg:scroll-mt-24 xl:grid-cols-[300px_minmax(0,1fr)]"
    >
      <header className="grid min-w-0 gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6 md:col-start-2">
        <nav
          aria-label="Путь к компании"
          className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
        >
          <Button
            variant="link"
            size="sm"
            disabled={busy}
            onClick={onCompanies}
            className="h-auto shrink-0 p-0 text-xs text-muted-foreground"
          >
            Компании
          </Button>
          <ChevronRightIcon aria-hidden="true" className="size-3 shrink-0" />
          <span aria-current="page" className="truncate">
            {company.name}
          </span>
        </nav>
        <div className="flex min-w-0 flex-col items-start justify-between gap-4 lg:flex-row">
          <div className="grid min-w-0 flex-1 gap-2">
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
              {company.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editing && canEdit
                ? 'Редактирование профиля компании'
                : 'О компании, контакты и открытые потребности.'}
            </p>
          </div>
          {canEdit && !editing && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                onEdit();
                setEditing(true);
              }}
              className="shrink-0"
            >
              <PencilIcon />
              Редактировать
            </Button>
          )}
        </div>
      </header>
      <div
        className={cn(
          'min-w-0 self-stretch md:col-start-1 md:row-start-1 md:row-span-2',
          editing && canEdit && 'hidden md:block',
        )}
      >
        <CompanyProfileSummary
          company={company}
          api={api}
          busy={busy}
          onTeam={onTeam}
          onDocuments={onDocuments}
        />
      </div>
      <div className="grid min-w-0 gap-5 md:col-start-2">
        {editing && canEdit ? (
          <CompanyProfileForm
            company={company}
            pending={busy}
            error={error}
            onSave={onSave}
            onSaved={finish}
            onDirtyChange={onDirtyChange}
            onCancel={() => unsaved.guard(finish)}
          />
        ) : (
          <>
            <section
              aria-label="О компании"
              className="grid min-w-0 gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6"
            >
              <h2 className="text-xl font-semibold">О компании</h2>
              <p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">
                {company.description || 'Описание компании пока не добавлено.'}
              </p>
            </section>
            {visible && (
              <CompanyProfileVacancies
                company={company}
                api={api}
                catalogs={catalogs}
                skills={skills}
                revision={revision}
                busy={busy}
                onVacancies={onVacancies}
                onOpen={onOpenNeed}
              />
            )}
          </>
        )}
      </div>
      <ConfirmDiscardDialog
        open={unsaved.open}
        onCancel={unsaved.cancel}
        onProceed={unsaved.proceed}
      />
    </div>
  );
};
