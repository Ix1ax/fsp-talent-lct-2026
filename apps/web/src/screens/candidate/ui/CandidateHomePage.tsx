'use client';

import { usePathname } from 'next/navigation';

import { STATIC_ROUTES } from '@/shared/contants';
import { PageHeader, PageWrapper } from '@/shared/ui';
import type { CandidateFullProfile } from '@/entities/candidate';
import type { CatalogItem } from '@/entities/catalog';
import type { SessionUser } from '@/entities/session';

import { useCandidateWorkspace } from '../model';
import { CandidateProfileEditor } from './CandidateProfileEditor';
import { CandidateProfileLoadError } from './CandidateProfileLoadError';
import { CandidateResumeImport } from './CandidateResumeImport';

interface CandidateHomePageProps {
  user: SessionUser;
  initialFullProfile?: CandidateFullProfile;
  workFormats?: CatalogItem[];
  loadError?: string;
  catalogsError?: string;
}

export const CandidateHomePage = ({
  loadError,
  catalogsError,
  ...options
}: CandidateHomePageProps) => {
  const workspace = useCandidateWorkspace(options);
  const pathname = usePathname();

  const { profileContainerRef } = workspace;

  return (
    <PageWrapper
      variant="page"
      ref={profileContainerRef}
      hidden={pathname === STATIC_ROUTES.CANDIDATE}
      className="[overflow-anchor:none]"
    >
      <div className="flex flex-col gap-8">
        <PageHeader>
          <PageHeader.Row>
            <PageHeader.Content>
              <PageHeader.Title>Мой профиль</PageHeader.Title>
              <PageHeader.Description>
                Расскажите об опыте и условиях работы. Публикацией профиля
                управляете вы.
              </PageHeader.Description>
            </PageHeader.Content>
          </PageHeader.Row>
        </PageHeader>
        {loadError ? (
          <CandidateProfileLoadError error={loadError} />
        ) : (
          <>
            {catalogsError && (
              <CandidateProfileLoadError
                error={catalogsError}
                title="Справочник недоступен"
              />
            )}
            <CandidateResumeImport workspace={workspace} />
            <CandidateProfileEditor workspace={workspace} />
          </>
        )}
      </div>
    </PageWrapper>
  );
};
