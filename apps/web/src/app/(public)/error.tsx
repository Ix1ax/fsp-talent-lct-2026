'use client';

import { ServiceErrorPage } from '@/screens/service-error';

interface PublicErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const PublicError = ({ error, reset }: PublicErrorProps) => {
  return <ServiceErrorPage error={error} reset={reset} />;
};

export default PublicError;
