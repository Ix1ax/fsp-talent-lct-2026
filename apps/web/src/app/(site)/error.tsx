'use client';

import { ServiceErrorPage } from '@/screens/service-error';

interface SiteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SiteError = ({ error, reset }: SiteErrorProps) => {
  return <ServiceErrorPage error={error} reset={reset} />;
};

export default SiteError;
