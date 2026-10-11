import type { Metadata } from 'next';

import { CandidateProfileOverview } from '@/screens/candidate';

export const metadata: Metadata = { title: 'Кабинет кандидата · ФСП' };

const CandidateProfileIndexPage = () => {
  return <CandidateProfileOverview />;
};

export default CandidateProfileIndexPage;
