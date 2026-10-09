import Link from 'next/link';
import { FileTextIcon } from 'lucide-react';

import {
  DYNAMIC_ROUTES,
  LEGAL_DOCUMENTS,
  type LegalDocumentSlug,
} from '@/shared/contants';
import { cn } from '@/shared/lib/utils';
import { PageHeader } from '@/shared/ui';

interface LegalDocumentPageProps {
  slug: LegalDocumentSlug;
}

export const LegalDocumentPage = ({ slug }: LegalDocumentPageProps) => {
  const current =
    LEGAL_DOCUMENTS.find((doc) => doc.slug === slug) ?? LEGAL_DOCUMENTS[0];

  return (
    <main className="container-page page-rhythm flex flex-col gap-8">
      <PageHeader
        eyebrow="Документы"
        title={current.title}
        description={current.description}
      />
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <nav
          aria-label="Документы"
          className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-2"
        >
          {LEGAL_DOCUMENTS.map((doc) => (
            <Link
              key={doc.slug}
              href={DYNAMIC_ROUTES.LEGAL(doc.slug)}
              aria-current={doc.slug === current.slug ? 'page' : undefined}
              className={cn(
                'rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-hover',
                doc.slug === current.slug &&
                  'bg-accent font-semibold text-brand-text hover:bg-accent',
              )}
            >
              {doc.title}
            </Link>
          ))}
        </nav>
        <article className="flex min-h-80 flex-col items-start gap-4 rounded-xl border border-dashed border-input bg-card p-6 sm:p-10">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-brand-text">
            <FileTextIcon className="size-6" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold">Документ готовится</h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Здесь будет опубликована утверждённая редакция документа «
            {current.title}». Текст предоставляет оператор сервиса.
          </p>
        </article>
      </div>
    </main>
  );
};
