import { LEGAL_DOCUMENTS, type LegalDocumentSlug } from '@/shared/contants';
import { PageHeader, PageWrapper } from '@/shared/ui';

import { LegalDocumentContent } from './LegalDocumentContent';
import { LegalDocumentNavigation } from './LegalDocumentNavigation';

interface LegalDocumentPageProps {
  slug: LegalDocumentSlug;
}

export const LegalDocumentPage = ({ slug }: LegalDocumentPageProps) => {
  const current =
    LEGAL_DOCUMENTS.find((doc) => doc.slug === slug) ?? LEGAL_DOCUMENTS[0];

  return (
    <PageWrapper>
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <LegalDocumentNavigation slug={current.slug} />
        <div className="min-w-0 space-y-6">
          <PageHeader>
            <PageHeader.Row>
              <PageHeader.Content>
                <PageHeader.Title>{current.title}</PageHeader.Title>
                <PageHeader.Description>
                  {current.description}
                </PageHeader.Description>
              </PageHeader.Content>
            </PageHeader.Row>
          </PageHeader>
          <LegalDocumentContent slug={current.slug} />
        </div>
      </div>
    </PageWrapper>
  );
};
