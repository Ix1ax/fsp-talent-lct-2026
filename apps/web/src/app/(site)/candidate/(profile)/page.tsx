import type { Metadata } from 'next';

import { CandidateProfileOverview } from '@/screens/candidate';

export const metadata: Metadata = { title: 'Кабинет кандидата · ФСП' };

export default function CandidateProfileIndexPage() {
  return <CandidateProfileOverview />;
}
