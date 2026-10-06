'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { STATIC_ROUTES } from '@/shared/contants';
import {
  completeOidcCallback,
  type CompleteOidcCallbackResult,
} from '@/features/auth';

import { CallbackError } from './CallbackError';
import { CallbackInactive } from './CallbackInactive';
import { CallbackLoading } from './CallbackLoading';
import { CallbackRoleChooser } from './CallbackRoleChooser';

type CallbackViewState =
  | { status: 'loading' }
  | Extract<
      CompleteOidcCallbackResult,
      { status: 'role_chooser' | 'inactive' | 'error' }
    >;

export const CallbackPage = () => {
  const router = useRouter();
  const [state, setState] = useState<CallbackViewState>({ status: 'loading' });

  useEffect(() => {
    const run = async () => {
      const result = await completeOidcCallback();

      if (result.status === 'authenticated') {
        router.replace(STATIC_ROUTES.CABINET);
        return;
      }

      if (result.status === 'unauthorized') {
        router.replace(STATIC_ROUTES.LOGIN);
        return;
      }

      setState(result);
    };

    void run();
  }, [router]);

  if (state.status === 'loading') {
    return <CallbackLoading />;
  }

  if (state.status === 'role_chooser') {
    return <CallbackRoleChooser />;
  }

  if (state.status === 'inactive') {
    return <CallbackInactive />;
  }

  return <CallbackError message={state.message} />;
};
