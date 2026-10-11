import type { SigninRedirectArgs } from 'oidc-client-ts';

import { isObject } from '@/shared/utils';

export const usesServerPkce = (): boolean =>
  typeof window !== 'undefined' &&
  window.location.protocol === 'http:' &&
  !window.crypto?.subtle;

export const getHttpPkceArgs = async (): Promise<
  SigninRedirectArgs | undefined
> => {
  if (!usesServerPkce()) return undefined;
  const response = await fetch('/api/auth/pkce', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось подготовить вход');
  const data: unknown = await response.json();
  if (
    !isObject(data) ||
    typeof data.verifier !== 'string' ||
    !/^[A-Za-z0-9_-]{43,128}$/.test(data.verifier) ||
    typeof data.challenge !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(data.challenge)
  )
    throw new Error('Некорректные параметры входа');
  return {
    extraQueryParams: {
      code_challenge: data.challenge,
      code_challenge_method: 'S256',
    },
    extraTokenParams: { code_verifier: data.verifier },
  };
};
