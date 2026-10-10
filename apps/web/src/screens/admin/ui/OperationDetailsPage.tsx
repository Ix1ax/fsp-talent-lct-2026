'use client';

import type { OperationSection } from '@/features/admin';

import { AttemptDetails } from './AttemptDetails';
import { CompanyDetails } from './CompanyDetails';
import { NeedDetails } from './NeedDetails';
import { OfferDetails } from './OfferDetails';
import { TaskDetails } from './TaskDetails';
import { UserDetails } from './UserDetails';

interface OperationDetailsPageProps {
  section: OperationSection;
  id: string;
}
const details = {
  companies: CompanyDetails,
  users: UserDetails,
  needs: NeedDetails,
  offers: OfferDetails,
  tasks: TaskDetails,
  attempts: AttemptDetails,
};
export const OperationDetailsPage = ({
  section,
  id,
}: OperationDetailsPageProps) => {
  const Page = details[section];
  return <Page key={id} id={id} />;
};
