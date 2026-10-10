import { notFound } from 'next/navigation';

import { PROFILE_STEPS } from '@/screens/candidate/constants';

const CandidateProfileSectionPage = async ({
  params,
}: {
  params: Promise<{ section: string }>;
}) => {
  const { section } = await params;
  if (!PROFILE_STEPS.some((step) => step.id === section)) notFound();

  return null;
};

export default CandidateProfileSectionPage;
