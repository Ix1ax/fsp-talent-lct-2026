import type { Metadata } from 'next';

import { EmployerDemo } from './_demo';
export const metadata: Metadata = {
  title: 'Демо кабинета работодателя — ФСП Скаут',
  robots: { index: false, follow: false },
};
interface EmployerDemoPageProps {
  searchParams: Promise<{ scenario?: string }>;
}
const scenarios = [
  'filled',
  'empty',
  'no-company',
  'viewer',
  'error',
  'save-error',
];
const EmployerDemoPage = async ({ searchParams }: EmployerDemoPageProps) => {
  const { scenario: requested } = await searchParams;
  const scenario =
    requested && scenarios.includes(requested) ? requested : 'filled';
  return <EmployerDemo key={scenario} scenario={scenario} />;
};

export default EmployerDemoPage;
