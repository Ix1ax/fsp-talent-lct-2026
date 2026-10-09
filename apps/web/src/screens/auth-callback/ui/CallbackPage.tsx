'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { takeLoginReturnPath } from '@/shared/auth/loginReturnPath';
import { STATIC_ROUTES } from '@/shared/contants';
import { getRoleHomeRoute } from '@/entities/session';
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
    let active = true;

    const run = async () => {
      const result = await completeOidcCallback(window.location.href);
      if (!active) return;

      if (result.status === 'authenticated') {
        if (!result.user.role) {
          setState({ status: 'role_chooser' });
          return;
        }

        router.replace(takeLoginReturnPath(getRoleHomeRoute(result.user.role)));
        return;
      }

      if (result.status === 'unauthorized') {
        router.replace(STATIC_ROUTES.LOGIN);
        return;
      }

      setState(result);
    };

    void run();

    return () => {
      active = false;
    };
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
