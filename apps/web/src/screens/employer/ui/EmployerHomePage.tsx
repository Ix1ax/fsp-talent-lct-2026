'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';

import { AsyncState, PageWrapper } from '@/shared/ui';
import type { Skill } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import { loadStatusVacancies } from '@/features/employer-search';
import { SiteFooter } from '@/widgets/site-footer';

import { getEmployerSection } from '../constants';
import { employerGateway } from '../lib';
import { useEmployerBoard, useEmployerWorkspace } from '../model';
import { EmployerCandidateDialogs } from './EmployerCandidateDialogs';
import { EmployerHeader } from './EmployerHeader';
import { EmployerPageHeader } from './EmployerPageHeader';
import { EmployerWorkspaceContent } from './EmployerWorkspaceContent';

const EMPTY_SKILLS: Skill[] = [];

interface EmployerHomePageProps {
  user: SessionUser;
}

export const EmployerHomePage = ({ user }: EmployerHomePageProps) => {
  const api = employerGateway;
  const pathname = usePathname();
  const section = getEmployerSection(pathname.split('/')[2] ?? '');
  const board = useEmployerBoard(api, section === 'vacancies');
  const { mainRef, ...workspace } = useEmployerWorkspace({ section, board });
  const loadActiveNeeds = useCallback(
    (signal: AbortSignal) =>
      loadStatusVacancies(api, board.companyId, 'active', signal),
    [api, board.companyId],
  );

  return (
    <div className="flex flex-col">
      <EmployerHeader
        user={user}
        section={section}
        busy={workspace.busy}
        hasCompany={!!board.company}
        href={workspace.sectionHref}
        onNavigate={workspace.openSection}
      />
      <PageWrapper
        variant="workspace"
        ref={mainRef}
        className="scroll-mt-40 [overflow-anchor:none] lg:scroll-mt-24"
      >
        <div className="flex flex-col gap-6">
          <EmployerPageHeader
            section={section}
            board={board}
            workspace={workspace}
          />
          {board.resources && board.catalogsError && (
            <AsyncState
              error
              title="Справочники условий недоступны"
              description={board.catalogsError}
              onRetry={board.retryCatalogs}
            />
          )}
          <EmployerWorkspaceContent
            user={user}
            section={section}
            board={board}
            workspace={workspace}
            api={api}
            skills={EMPTY_SKILLS}
            loadActiveNeeds={loadActiveNeeds}
          />
        </div>
      </PageWrapper>
      <SiteFooter />
      <EmployerCandidateDialogs
        section={section}
        board={board}
        workspace={workspace}
        api={api}
      />
    </div>
  );
};
