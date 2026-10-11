import { useLayoutEffect, useRef, useState } from 'react';
import { PencilIcon } from 'lucide-react';

import { useUnsavedGuard } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company, CompanyInput } from '@/entities/company';
import type { EmployerNeed } from '@/entities/employer-need';
import { CompanyProfileForm } from '@/features/company';

import type { EmployerGateway } from '../lib';
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
  onVacancies,
  onOpenNeed,
}: EmployerCompanyProfileProps) => {
  const [editing, setEditing] = useState(false);
  const unsaved = useUnsavedGuard(dirty, busy, false);
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
      className="grid min-w-0 scroll-mt-40 items-start gap-5 md:grid-cols-[260px_minmax(0,1fr)] lg:scroll-mt-24 xl:grid-cols-[300px_minmax(0,1fr)]"
    >
      <div
        className={cn(
          'min-w-0 self-stretch md:col-start-1 md:row-start-1',
          editing && canEdit && 'hidden md:block',
        )}
      >
        <CompanyProfileSummary company={company} api={api} />
      </div>
      <div className="grid min-w-0 gap-5 md:col-start-2 md:row-start-1">
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
              className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">О компании</h2>
                {canEdit && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      onEdit();
                      setEditing(true);
                    }}
                  >
                    <PencilIcon />
                    Редактировать
                  </Button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">
                {company.description || 'Описание компании пока не добавлено.'}
              </p>
            </section>
            {visible && (
              <CompanyProfileVacancies
                active={visible}
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
    </div>
  );
};
