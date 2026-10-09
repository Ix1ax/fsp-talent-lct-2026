import { notFound } from 'next/navigation';

import { USER_ROLES } from '@/entities/session';
import { requireRole } from '@/entities/session/api/server';
import { getEmployerSection } from '@/screens/employer/constants/sections';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ token?: string; company?: string }>;
}) {
  const { section } = await params;
  if (getEmployerSection(section) === 'overview') notFound();
  const query = await searchParams;
  const next = new URLSearchParams();
  if (query.token && section === 'invitation') next.set('token', query.token);
  if (query.company) next.set('company', query.company);
  await requireRole(
    USER_ROLES.EMPLOYER,
    `/employer/${section}${next.size ? `?${next}` : ''}`,
  );
  return null;
}
