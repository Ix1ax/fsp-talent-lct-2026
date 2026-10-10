'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { AsyncState, Button, PageHeader, Skeleton } from '@/shared/ui';
import type { Skill } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';
import {
  AcceptInvitation,
  CompanyDocuments,
  CompanyProfileForm,
  CompanyTeam,
} from '@/features/company';
import {
  CandidateBank,
  CandidateDetails,
  CompanyOffers,
  OfferComposer,
} from '@/features/employer-bank';
import { loadStatusVacancies } from '@/features/employer-search';
import { CompanySwitcher } from '@/widgets/employer-shell';
import { SiteFooter } from '@/widgets/site-footer';

import { EMPLOYER_SECTIONS, getEmployerSection } from '../constants';
import { employerGateway } from '../lib';
import { useEmployerBoard, useEmployerWorkspace } from '../model';
import { EmployerCompanyOnboarding } from './EmployerCompanyOnboarding';
import { EmployerCompanyProfile } from './EmployerCompanyProfile';
import { EmployerHeader } from './EmployerHeader';
import { EmployerNavigation } from './EmployerNavigation';
import { EmployerOverview } from './EmployerOverview';
import { VacancyBank } from './VacancyBank';

const EMPTY_SKILLS: Skill[] = [];

interface EmployerHomePageProps {
  user: SessionUser;
}
export const EmployerHomePage = ({ user }: EmployerHomePageProps) => {
  const api = employerGateway;
  const pathname = usePathname();
  const section = getEmployerSection(pathname.split('/')[2] ?? '');
  const board = useEmployerBoard(api, section === 'vacancies');
  const skills = EMPTY_SKILLS;
  const loadActiveNeeds = useCallback(
    (signal: AbortSignal) =>
      loadStatusVacancies(api, board.companyId, 'active', signal),
    [api, board.companyId],
  );

  const {
    router,
    drafts,
    createCompany,
    setCreateCompany,
    mainRef,
    createdNeed,
    setCreatedNeed,
    composer,
    setComposer,
    busy,
    dirtyChanged,
    profileDirtyChanged,
    teamDirtyChanged,
    documentsDirtyChanged,
    invitationDirtyChanged,
    busyChanged,
    archiveConfirm,
    setArchiveConfirm,
    candidateId,
    setCandidateId,
    offer,
    setOffer,
    guardNeed,
    guard,
    href,
    navigate,
    startCompany,
    refreshCompanies,
  } = useEmployerWorkspace({ section, board });

  const selectedSection = EMPLOYER_SECTIONS.find((item) => item.id === section);
  const company = board.company;
  const centered =
    createCompany ||
    section === 'invitation' ||
    (!!board.resources && !company);
  const profileView = section === 'profile' && !!company && !createCompany;
  const companySwitcher = board.resources && (
    <CompanySwitcher
      companies={board.resources.companies}
      company={company}
      pending={busy}
      onCompany={(id) =>
        guard(() => {
          setCreateCompany(false);
          setComposer(false);
          setCandidateId('');
          board.chooseCompany(id);
        })
      }
      onSettings={() => navigate('profile')}
      onCreateCompany={startCompany}
    />
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <EmployerHeader
        user={user}
        section={section}
        busy={busy}
        hasCompany={!!company}
        href={href}
        onNavigate={navigate}
      />
      <main
        ref={mainRef}
        className="container-page page-rhythm flex-1 scroll-mt-40 [overflow-anchor:none] lg:scroll-mt-24"
      >
        <div className="flex flex-col gap-8">
          {!profileView && (
            <PageHeader
              className={cn(centered && 'mx-auto w-full max-w-2xl')}
              eyebrow={
                company && !centered && section !== 'overview'
                  ? `Работодатель · ${company.name}`
                  : 'Работодатель'
              }
              title={
                createCompany
                  ? 'Создание компании'
                  : section === 'overview'
                    ? 'Компании'
                    : section === 'invitation'
                      ? 'Приглашение в компанию'
                      : selectedSection?.title
              }
              description={
                section === 'overview'
                  ? 'Ваши компании и команды. Выберите компанию, чтобы работать с её профилем, сотрудниками и потребностями.'
                  : selectedSection?.description
              }
              actions={
                board.resources &&
                board.resources.companies.length > 0 &&
                !centered &&
                section !== 'overview' ? (
                  <div className="flex min-w-0 flex-col items-start gap-1 sm:max-w-xs sm:items-end">
                    {companySwitcher}
                    {company && (
                      <p className="text-xs text-muted-foreground">
                        {
                          {
                            owner: 'Владелец',
                            recruiter: 'Рекрутер',
                            viewer: 'Наблюдатель',
                          }[company.memberRole]
                        }
                      </p>
                    )}
                  </div>
                ) : undefined
              }
            />
          )}
          {board.resources && board.catalogsError && (
            <AsyncState
              error
              title="Справочники условий недоступны"
              description={board.catalogsError}
              onRetry={board.retryCatalogs}
            />
          )}
          {board.error ? (
            <AsyncState
              error
              title="Не удалось открыть кабинет"
              description={board.error}
              onRetry={board.retry}
            />
          ) : !board.resources ? (
            <div
              role="status"
              aria-label="Загрузка кабинета"
              className="grid gap-4"
            >
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              {section === 'invitation' ? (
                <div className="mx-auto grid w-full max-w-2xl gap-4">
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
              ) : createCompany ? (
                <div className="mx-auto grid w-full max-w-2xl gap-4">
                  <Button
                    variant="ghost"
                    className="justify-self-start"
                    disabled={busy}
                    onClick={() => navigate('overview')}
                  >
                    <ArrowLeftIcon /> Обзор кабинета
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
                      router.push(href('documents', savedCompany.id), {
                        scroll: false,
                      });
                    }}
                  />
                </div>
              ) : !company ? (
                <EmployerCompanyOnboarding
                  api={api}
                  busy={busy}
                  onCreate={startCompany}
                  onAccepted={refreshCompanies}
                  onDirtyChange={invitationDirtyChanged}
                  onBusyChange={busyChanged}
                />
              ) : (
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
                          router.push(href(nextSection, id), { scroll: false });
                        })
                      }
                    />
                  )}
                  <div
                    hidden={section === 'overview'}
                    className="grid min-w-0 items-start gap-5"
                  >
                    {profileView && (
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                          Профиль компании
                        </p>
                        <div className="min-w-0 sm:max-w-xs">
                          {companySwitcher}
                        </div>
                      </div>
                    )}
                    <div
                      className="min-w-0"
                      hidden={
                        !['profile', 'documents', 'team'].includes(section)
                      }
                    >
                      <EmployerNavigation
                        section={section}
                        busy={busy}
                        href={href}
                        onNavigate={navigate}
                      />
                    </div>
                    <div
                      className={cn(
                        'grid min-w-0 scroll-mt-40 gap-5 lg:scroll-mt-24',
                        (section === 'documents' || section === 'team') &&
                          'mx-auto w-full max-w-4xl',
                      )}
                      key={company.id}
                    >
                      <section
                        hidden={section !== 'profile'}
                        aria-label="Профиль компании"
                      >
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
                          onCompanies={() => navigate('overview')}
                          onVacancies={() => {
                            guardNeed(() => {
                              setComposer(false);
                              setCreatedNeed(false);
                              board.chooseStatus('active');
                              router.push(href('vacancies'), { scroll: false });
                            });
                          }}
                          onOpenNeed={(need) => {
                            guardNeed(() => {
                              setComposer(false);
                              setCreatedNeed(false);
                              board.openNeed(need);
                              router.push(href('vacancies'), { scroll: false });
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
                      <section
                        hidden={section !== 'team'}
                        aria-label="Сотрудники"
                      >
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
                      <section
                        hidden={section !== 'vacancies'}
                        aria-label="Потребности"
                      >
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
                          onCandidate={setCandidateId}
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
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
      {company && board.resources && candidateId && !offer && (
        <CandidateDetails
          company={company}
          catalogs={board.catalogs}
          candidateId={candidateId}
          api={api}
          busy={busy}
          onClose={() => setCandidateId('')}
          onOffer={() => setOffer(true)}
        />
      )}
      {company && candidateId && offer && (
        <OfferComposer
          company={company}
          candidateId={candidateId}
          need={
            board.selected?.status === 'active' ? board.selected : undefined
          }
          api={api}
          onBusyChange={busyChanged}
          onClose={() => setOffer(false)}
          onSent={() => {
            setOffer(false);
            setCandidateId('');
          }}
        />
      )}
    </div>
  );
};
