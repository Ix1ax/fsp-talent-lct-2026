import { useRouter } from 'next/navigation';

import { getUnsavedChangesGuard } from './unsavedChangesGuard';

export const useGuardedRouter = () => {
  const router = useRouter();

  return {
    ...router,
    push: (...args: Parameters<typeof router.push>) => {
      getUnsavedChangesGuard().navigate(args[0], () => router.push(...args));
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      getUnsavedChangesGuard().navigate(args[0], () => router.replace(...args));
    },
  };
};
