import type { ReactNode } from 'react';

import { loadSession } from '@/entities/session/api/server';
import { EmployerHomePage, EmployerSessionRecovery } from '@/screens/employer';

interface EmployerLayoutProps {
  children: ReactNode;
}

export default async function EmployerLayout({
  children,
}: EmployerLayoutProps) {
  const session = await loadSession();

  if (session.kind !== 'user') {
    return (
      <EmployerSessionRecovery
        message={session.kind === 'unavailable' ? session.message : undefined}
      />
    );
  }

  if (session.user.role !== 'employer') return children;

  return (
    <>
      <EmployerHomePage user={session.user} />
      {children}
    </>
  );
}
