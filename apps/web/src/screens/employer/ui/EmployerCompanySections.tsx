import type { Skill } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import { CompanyDocuments, CompanyTeam } from '@/features/company';
import { CompanyTaskSolutions } from '@/features/company-task-review';
import { CandidateBank, CompanyOffers } from '@/features/employer-bank';
import type { loadStatusVacancies } from '@/features/employer-search';

import type { EmployerSection } from '../constants';
import type { employerGateway } from '../lib';
import type { EmployerBoard, EmployerWorkspace } from '../model';
import { EmployerCompanyProfile } from './EmployerCompanyProfile';
import { EmployerNavigation } from './EmployerNavigation';
import { EmployerOverview } from './EmployerOverview';
import { VacancyBank } from './VacancyBank';

interface EmployerCompanySectionsProps {
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

export const EmployerCompanySections = ({
  user,
  section,
  board,
  workspace,
  api,
  skills,
  loadActiveNeeds,
}: EmployerCompanySectionsProps) => {
  const {
    openHref,
    drafts,
    busy,
    guard,
    guardNeed,
    href,
    navigate,
    startCompany,
    refreshCompanies,
    setComposer,
    setCreatedNeed,
    setCandidateId,
    openCandidate,
    profileDirtyChanged,
    documentsDirtyChanged,
    teamDirtyChanged,
    busyChanged,
    composer,
    createdNeed,
    archiveConfirm,
    setArchiveConfirm,
    dirtyChanged,
    tasksDirtyChanged,
  } = workspace;
  const company = board.company;
  if (!company || !board.resources) return null;
  return (
    <>
      {section === 'overview' && (
        <EmployerOverview
          companies={board.resources.companies}
          busy={busy}
          onCreateCompany={startCompany}
          onInvitation={() => navigate('invitation')}
          onOpenCompany={(id, nextSection) =>
            guard(() => {
              setComposer(false);
              setCreatedNeed(false);
              setCandidateId('');
              if (id !== board.companyId) board.chooseCompany(id);
              else board.select('');
              openHref(href(nextSection, id));
            })
          }
        />
      )}
      <div
        hidden={section === 'overview'}
        className="grid min-w-0 items-start gap-5"
      >
        <div
          className="min-w-0"
          hidden={!['profile', 'documents', 'team'].includes(section)}
        >
          <EmployerNavigation
            section={section}
            busy={busy}
            href={href}
            onNavigate={navigate}
          />
        </div>
        <div
          className="grid min-w-0 scroll-mt-40 gap-5 lg:scroll-mt-24"
          key={company.id}
        >
          <section hidden={section !== 'profile'} aria-label="Профиль компании">
            <EmployerCompanyProfile
              company={company}
              api={api}
              catalogs={board.catalogs}
              skills={skills}
              revision={board.revision}
              visible={section === 'profile'}
              busy={busy}
              dirty={drafts.profile ?? false}
              error={board.companyError}
              onSave={board.saveCompany}
              onDirtyChange={profileDirtyChanged}
              onEdit={board.clearError}
              onVacancies={() => {
                guardNeed(() => {
                  setComposer(false);
                  setCreatedNeed(false);
                  board.chooseStatus('active');
                  openHref(href('vacancies'));
                });
              }}
              onOpenNeed={(need) => {
                guardNeed(() => {
                  setComposer(false);
                  setCreatedNeed(false);
                  board.openNeed(need);
                  openHref(href('vacancies'));
                });
              }}
            />
          </section>
          <section
            hidden={section !== 'documents'}
            aria-label="Документы и логотип"
          >
            <CompanyDocuments
              company={company}
              api={api}
              onCompanyChange={refreshCompanies}
              active={section === 'documents'}
              onDirtyChange={documentsDirtyChanged}
              onBusyChange={busyChanged}
            />
          </section>
          <section hidden={section !== 'team'} aria-label="Сотрудники">
            <CompanyTeam
              company={company}
              active={section === 'team'}
              userId={user.id}
              api={api}
              onCompanyChange={refreshCompanies}
              onBusyChange={busyChanged}
              onDirtyChange={teamDirtyChanged}
            />
          </section>
          <section hidden={section !== 'vacancies'} aria-label="Потребности">
            <VacancyBank
              active={section === 'vacancies'}
              board={board}
              api={api}
              catalogs={board.catalogs}
              skills={skills}
              composer={composer}
              created={createdNeed}
              dirty={drafts.vacancies ?? false}
              archiveConfirm={archiveConfirm}
              onArchiveConfirm={(value) => {
                setArchiveConfirm(value);
              }}
              guard={guardNeed}
              onCreate={() =>
                guardNeed(() => {
                  setCreatedNeed(false);
                  setComposer(true);
                  board.clearError();
                })
              }
              onSelect={(id) =>
                guardNeed(() => {
                  setCreatedNeed(false);
                  setComposer(false);
                  board.select(id);
                })
              }
              onBack={() =>
                guardNeed(() => {
                  setComposer(false);
                  board.select('');
                })
              }
              onDirtyChange={dirtyChanged}
              onCreated={() => {
                dirtyChanged(false);
                setCreatedNeed(true);
                setComposer(false);
              }}
              onCandidate={openCandidate}
            />
          </section>
          {section === 'candidates' && (
            <CandidateBank
              company={company}
              api={api}
              catalogs={board.catalogs}
              skills={skills}
              onBusyChange={busyChanged}
              loadNeeds={loadActiveNeeds}
              revision={board.revision}
              onNeeds={() => navigate('vacancies')}
            />
          )}
          {section === 'offers' && (
            <CompanyOffers
              company={company}
              api={api}
              onBusyChange={busyChanged}
            />
          )}
          {section === 'tasks' && (
            <CompanyTaskSolutions
              company={company}
              catalogs={board.catalogs}
              onOpenCandidate={openCandidate}
              onDirtyChange={tasksDirtyChanged}
              onBusyChange={busyChanged}
            />
          )}
        </div>
      </div>
    </>
  );
};
