'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { takeLoginReturnPath } from '@/shared/auth/loginReturnPath';
import { STATIC_ROUTES } from '@/shared/contants';
import { sanitizeRedirectPath } from '@/shared/utils';
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

        let destination = getRoleHomeRoute(result.user.role);

        if (result.next) {
          const safeNext = sanitizeRedirectPath(result.next);
          const nextPathname = new URL(safeNext, 'https://app.invalid')
            .pathname;
          const isAllowedForRole =
            (result.user.role === 'candidate' &&
              (nextPathname === STATIC_ROUTES.CANDIDATE ||
                nextPathname.startsWith(`${STATIC_ROUTES.CANDIDATE}/`) ||
                safeNext === STATIC_ROUTES.CABINET)) ||
            (result.user.role === 'employer' &&
              (nextPathname === STATIC_ROUTES.EMPLOYER ||
                nextPathname.startsWith(`${STATIC_ROUTES.EMPLOYER}/`) ||
                safeNext === STATIC_ROUTES.CABINET)) ||
            (result.user.role === 'admin' &&
              (nextPathname === STATIC_ROUTES.ADMIN ||
                nextPathname.startsWith(`${STATIC_ROUTES.ADMIN}/`) ||
                safeNext === STATIC_ROUTES.CABINET));

          if (isAllowedForRole) {
            destination = safeNext;
          }
        }

        router.replace(takeLoginReturnPath(destination));
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
