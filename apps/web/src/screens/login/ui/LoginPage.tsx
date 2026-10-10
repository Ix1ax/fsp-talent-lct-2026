import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { PageWrapper } from '@/shared/ui';

import { LoginPanel } from './LoginPanel';

export const LoginPage = () => {
  return (
    <PageWrapper variant="login">
      <div className="flex w-full max-w-110 flex-col gap-4">
        <LoginPanel />
        <Link
          href={STATIC_ROUTES.HOME}
          className="self-start text-sm text-brand-text underline-offset-4 hover:underline"
        >
          ← На главную
        </Link>
      </div>
    </PageWrapper>
  );
};
