import { Suspense } from 'react';

import { LoginPage } from '@/screens/login';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
