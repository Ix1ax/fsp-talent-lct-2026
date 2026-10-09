'use client';

import { type ReactNode, useCallback, useState } from 'react';
import { PlusIcon } from 'lucide-react';

import { useUnsavedGuard } from '@/shared/hooks/useUnsavedGuard';
import { Button, PageHeader, Skeleton } from '@/shared/ui';
import { AsyncState } from '@/shared/ui/AsyncState';
import { ConfirmDiscardDialog } from '@/shared/ui/ConfirmDiscardDialog';
import { MetaLabel } from '@/shared/ui/MetaLabel';
import type { SessionUser } from '@/entities/session';
import { CompanyForm } from '@/features/company';
import { ArchiveNeedDialog } from '@/features/employer-need';
import { EmployerSearch } from '@/features/employer-search';
import { EmployerShell } from '@/widgets/employer-shell';
import { NeedList } from '@/widgets/needs-board';
import { SiteFooter } from '@/widgets/site-footer';

import { type EmployerGateway, employerGateway } from '../lib/gateway';
import { useEmployerBoard } from '../model/useEmployerBoard';
import { EmployerNeedPane } from './EmployerNeedPane';

interface EmployerHomePageProps {
  user: SessionUser;
  gateway?: EmployerGateway;
  banner?: ReactNode;
  accountMenu?: ReactNode;
  homeHref?: string;
}
export const EmployerHomePage = ({
  user,
  gateway,
  banner,
  accountMenu,
  homeHref,
}: EmployerHomePageProps) => {
  const board = useEmployerBoard(gateway);
  const [composer, setComposer] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyChanged = useCallback((v: boolean) => setDirty(v), []);
  const [companyForm, setCompanyForm] = useState<'create' | 'edit' | null>(
    null,
  );
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [showMatches, setShowMatches] = useState(true);
  const unsaved = useUnsavedGuard(dirty, board.pending);
  const guard = (action: () => void) =>
    unsaved.guard(() => {
      setDirty(false);
      action();
    });
  const canWrite =
    board.company?.memberRole === 'owner' ||
    board.company?.memberRole === 'recruiter';
  const detail = !!board.selectedId || composer;
  const resources = board.resources;
  const select = (id: string) =>
    guard(() => {
      setComposer(false);
      setShowMatches(board.status === 'active');
      board.select(id);
    });
  const create = () =>
    guard(() => {
      setComposer(true);
      setShowMatches(false);
      board.clearError();
    });
  const listEmpty =
    !board.loading &&
    !board.listError &&
    board.items.length === 0 &&
    board.status === 'active' &&
    !composer;
  return (
    <EmployerShell
      accountMenu={accountMenu}
      footer={<SiteFooter />}
      homeHref={homeHref}
      search={
        <EmployerSearch
          api={gateway ?? employerGateway}
          companyId={board.companyId}
          revision={board.revision}
          disabled={board.pending}
          onSelect={(need) =>
            guard(() => {
              setComposer(false);
              setShowMatches(need.status === 'active');
              board.openNeed(need);
            })
          }
        />
      }
      user={user}
      companies={resources?.companies ?? []}
      company={board.company}
      pending={board.pending || !resources}
      onShowNeeds={() => select('')}
      onCompany={(id) =>
        guard(() => {
          setComposer(false);
          setShowMatches(false);
          board.chooseCompany(id);
        })
      }
      onSettings={() =>
        guard(() => {
          board.clearError();
          setCompanyForm('edit');
        })
      }
      onCreateCompany={() =>
        guard(() => {
          board.clearError();
          setCompanyForm('create');
        })
      }
    >
      {banner}
      {board.error ? (
        <main className="container-page page-rhythm">
          <AsyncState
            error
            title="Не удалось открыть кабинет"
            description={board.error}
            onRetry={board.retry}
          />
        </main>
      ) : !resources ? (
        <main
          className="container-page page-rhythm grid gap-5"
          role="status"
          aria-label="Загрузка кабинета"
        >
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
        </main>
      ) : !board.company ? (
        <main className="container-page page-rhythm grid min-h-[60vh] content-center">
          <div className="grid max-w-xl gap-5">
            <MetaLabel className="text-xs text-brand-text">
              Рабочее пространство
            </MetaLabel>
            <h1 className="text-3xl font-bold tracking-tight">
              Начнём с компании
            </h1>
            <p className="text-muted-foreground">
              Добавьте компанию, чтобы описать потребности команды и подобрать
              специалистов.
            </p>
            <Button
              className="justify-self-start"
              onClick={() => setCompanyForm('create')}
            >
              Создать компанию
            </Button>
          </div>
        </main>
      ) : (
        <div className="container-page page-rhythm flex flex-col gap-8">
          <PageHeader
            eyebrow={`Работодатель · ${board.company.name}`}
            title="Потребности"
            description="Кого ищет команда. Выберите потребность — откроются бриф и подборка."
            actions={
              canWrite && !listEmpty ? (
                <Button disabled={board.pending} onClick={create}>
                  <PlusIcon />
                  Новая потребность
                </Button>
              ) : undefined
            }
          />
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
            <NeedList
              list={board}
              catalogs={resources.catalogs}
              canWrite={canWrite}
              detail={detail}
              composer={composer}
              onSelect={select}
              onPage={(offset) => guard(() => board.page(offset))}
              onStatus={(status) =>
                guard(() => {
                  setComposer(false);
                  setShowMatches(false);
                  board.chooseStatus(status);
                })
              }
            />
            <EmployerNeedPane
              board={board}
              catalogs={resources.catalogs}
              skills={resources.skills}
              canWrite={canWrite}
              composer={composer}
              detail={detail}
              dirty={dirty}
              showMatches={showMatches}
              listEmpty={listEmpty}
              loadRecommendations={gateway?.recommendations}
              onDirtyChange={dirtyChanged}
              onStartCreate={create}
              onCreated={(active) => {
                setDirty(false);
                setComposer(false);
                setShowMatches(active);
              }}
              onSaved={() => setDirty(false)}
              onCancelCreate={() => setComposer(false)}
              onBack={() =>
                guard(() => {
                  setComposer(false);
                  board.select('');
                })
              }
              onFind={() => setShowMatches(true)}
              onArchive={() => guard(() => setArchiveConfirm(true))}
              onDuplicate={() =>
                guard(() => {
                  void board.duplicate().catch(() => {});
                })
              }
            />
          </div>
        </div>
      )}
      <ConfirmDiscardDialog
        open={unsaved.open}
        onCancel={unsaved.cancel}
        onProceed={unsaved.proceed}
      />
      {companyForm && (
        <CompanyForm
          key={`${companyForm}-${board.companyId}`}
          company={board.company}
          create={companyForm === 'create'}
          open
          pending={board.pending}
          error={board.companyError}
          onOpenChange={(v) => {
            if (!v) setCompanyForm(null);
          }}
          onSave={board.saveCompany}
        />
      )}
      <ArchiveNeedDialog
        open={archiveConfirm}
        pending={board.pending}
        error={board.saveError}
        onOpenChange={setArchiveConfirm}
        onConfirm={board.archive}
      />
    </EmployerShell>
  );
};
