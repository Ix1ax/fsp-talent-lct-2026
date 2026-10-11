import { LEGAL_DOCUMENTS, type LegalDocumentSlug } from '@/shared/contants';
import { PageHeader, PageWrapper } from '@/shared/ui';

import { LegalDocumentNavigation } from './LegalDocumentNavigation';
import { LegalDocumentPlaceholder } from './LegalDocumentPlaceholder';

interface LegalDocumentPageProps {
  slug: LegalDocumentSlug;
}

export const LegalDocumentPage = ({ slug }: LegalDocumentPageProps) => {
  const current =
    LEGAL_DOCUMENTS.find((doc) => doc.slug === slug) ?? LEGAL_DOCUMENTS[0];

  return (
    <PageWrapper>
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
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <LegalDocumentNavigation slug={current.slug} />
        <LegalDocumentPlaceholder title={current.title} />
      </div>
    </PageWrapper>
  );
};
