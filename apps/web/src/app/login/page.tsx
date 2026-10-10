import { Suspense } from 'react';

import { LoginPage } from '@/screens/login';

const Page = () => {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
};

export default Page;
