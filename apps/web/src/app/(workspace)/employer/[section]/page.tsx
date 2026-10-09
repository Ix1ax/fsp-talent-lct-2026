import { notFound } from 'next/navigation';

import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import {
  type EmployerSearchParams,
  getEmployerReturnPath,
  getEmployerSection,
} from '@/screens/employer';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<EmployerSearchParams>;
}) {
  const { section } = await params;

  if (getEmployerSection(section) === 'overview') notFound();

  const query = await searchParams;
  await requireRole(
    USER_ROLES.EMPLOYER,
    getEmployerReturnPath(getEmployerSection(section), query),
  );

  return null;
}
