'use client';

import { ServiceErrorPage } from '@/screens/service-error';

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const RootError = ({ error, reset }: RootErrorProps) => {
  return <ServiceErrorPage error={error} reset={reset} fullViewport />;
};

export default RootError;
