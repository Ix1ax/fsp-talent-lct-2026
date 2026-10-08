import { notFound } from 'next/navigation';

import { PROFILE_STEPS } from '@/screens/candidate/constants';

export default async function CandidateProfileSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!PROFILE_STEPS.some((step) => step.id === section)) notFound();
  return null;
}
