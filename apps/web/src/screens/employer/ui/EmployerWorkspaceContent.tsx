import { ArrowLeftIcon } from 'lucide-react';

import { Button, RemoteState, Skeleton } from '@/shared/ui';
import type { Skill } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import { AcceptInvitation, CompanyProfileForm } from '@/features/company';
import type { loadStatusVacancies } from '@/features/employer-search';

import type { EmployerSection } from '../constants';
import type { employerGateway } from '../lib';
import type { EmployerBoard, EmployerWorkspace } from '../model';
import { EmployerCompanyOnboarding } from './EmployerCompanyOnboarding';
import { EmployerCompanySections } from './EmployerCompanySections';

interface EmployerWorkspaceContentProps {
  user: SessionUser;
  section: EmployerSection;
  board: EmployerBoard;
  workspace: EmployerWorkspace;
  api: typeof employerGateway;
  skills: Skill[];
  loadActiveNeeds: (
    signal: AbortSignal,
  ) => ReturnType<typeof loadStatusVacancies>;
}

export const EmployerWorkspaceContent = ({
  user,
  section,
  board,
  workspace,
  api,
  skills,
  loadActiveNeeds,
}: EmployerWorkspaceContentProps) => {
  const {
    busy,
    navigate,
    invitationDirtyChanged,
    busyChanged,
    refreshCompanies,
    createCompany,
    profileDirtyChanged,
    setCreateCompany,
    router,
    href,
    startCompany,
  } = workspace;

  if (board.error || !board.resources) {
    return (
      <RemoteState
        loading={!board.error && !board.resources}
        error={board.error}
        retry={board.retry}
        errorTitle="Не удалось открыть кабинет"
        loadingLabel="Загрузка кабинета"
        loadingContent={
          <div className="grid gap-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-64" />
          </div>
        }
      />
    );
  }

  if (section === 'invitation') {
    return (
      <div className="grid w-full min-w-0 gap-4">
        <Button
          variant="ghost"
          className="self-start"
          disabled={busy}
          onClick={() => navigate('overview')}
        >
          <ArrowLeftIcon />
          Обзор кабинета
        </Button>
        <AcceptInvitation
          key="invitation"
          onDirtyChange={invitationDirtyChanged}
          api={api}
          onBusyChange={busyChanged}
          onAccepted={refreshCompanies}
        />
      </div>
    );
  }

  if (createCompany) {
    return (
      <div className="grid w-full min-w-0 gap-4">
        <Button
          variant="ghost"
          className="justify-self-start"
          disabled={busy}
          onClick={() => navigate('overview')}
        >
          <ArrowLeftIcon />
          Обзор кабинета
        </Button>
        <CompanyProfileForm
          key="create"
          company={null}
          create
          pending={board.pending}
          error={board.companyError}
          onSave={board.saveCompany}
          onDirtyChange={profileDirtyChanged}
          onSaved={(savedCompany) => {
            profileDirtyChanged(false);
            setCreateCompany(false);
            router.push(href('documents', savedCompany.id), { scroll: false });
          }}
        />
      </div>
    );
  }

  if (!board.company) {
    return (
      <EmployerCompanyOnboarding
        api={api}
        busy={busy}
        onCreate={startCompany}
        onAccepted={refreshCompanies}
        onDirtyChange={invitationDirtyChanged}
        onBusyChange={busyChanged}
      />
    );
  }

  return (
    <EmployerCompanySections
      user={user}
      section={section}
      board={board}
      workspace={workspace}
      api={api}
      skills={skills}
      loadActiveNeeds={loadActiveNeeds}
    />
  );
};
