import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LEGAL_DOCUMENTS } from '@/shared/contants';
import { LegalDocumentPage } from '@/screens/legal';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const findDocument = (slug: string) =>
  LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);

export const generateStaticParams = () =>
  LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }));

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const doc = findDocument((await params).slug);

  return { title: `${doc?.title ?? 'Документы'} · ФСП Скаут` };
};

export default async function Page({ params }: PageProps) {
  const doc = findDocument((await params).slug);
  if (!doc) notFound();

  return <LegalDocumentPage slug={doc.slug} />;
}
