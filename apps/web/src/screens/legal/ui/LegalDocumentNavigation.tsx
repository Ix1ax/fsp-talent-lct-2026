import Link from 'next/link';

import {
  DYNAMIC_ROUTES,
  LEGAL_DOCUMENTS,
  type LegalDocumentSlug,
} from '@/shared/contants';
import { cn } from '@/shared/lib/utils';

interface LegalDocumentNavigationProps {
  slug: LegalDocumentSlug;
}

export const LegalDocumentNavigation = ({
  slug,
}: LegalDocumentNavigationProps) => {
  return (
    <nav
      aria-label="Документы"
      className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-2"
    >
      {LEGAL_DOCUMENTS.map((doc) => (
        <Link
          key={doc.slug}
          href={DYNAMIC_ROUTES.LEGAL(doc.slug)}
          aria-current={doc.slug === slug ? 'page' : undefined}
          className={cn(
            'rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-hover',
            doc.slug === slug &&
              'bg-accent font-semibold text-brand-text hover:bg-accent',
          )}
        >
          {doc.title}
        </Link>
      ))}
    </nav>
  );
};
