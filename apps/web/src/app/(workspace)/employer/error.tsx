'use client';

import { ServiceErrorPage } from '@/screens/service-error';

interface EmployerErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const EmployerError = ({ error, reset }: EmployerErrorProps) => {
  return (
    <ServiceErrorPage
      error={error}
      reset={reset}
      fullViewport
      fallbackMessage="Не удалось загрузить данные кабинета работодателя. Попробуйте повторить попытку позже."
    />
  );
};

export default EmployerError;
