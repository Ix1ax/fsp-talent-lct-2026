import { notFound } from 'next/navigation';

import { PROFILE_STEPS } from '@/screens/candidate';

interface CandidateProfileSectionPageProps {
  params: Promise<{ section: string }>;
}

const CandidateProfileSectionPage = async ({
  params,
}: CandidateProfileSectionPageProps) => {
  const { section } = await params;
  if (!PROFILE_STEPS.some((step) => step.id === section)) notFound();

  return null;
};

export default CandidateProfileSectionPage;
