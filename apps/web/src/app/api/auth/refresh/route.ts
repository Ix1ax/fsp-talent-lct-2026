import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/shared/api/errors';
import {
  getAuthOrigin,
  validateAuthMutation,
} from '@/shared/auth/request.server';
import {
  clearAuthTokens,
  getRefreshToken,
  refreshAuthTokens,
  setAuthTokens,
} from '@/shared/auth/server';
import { sanitizeRedirectPath } from '@/shared/utils';

const doRefresh = async (): Promise<{
  accessToken: string;
  expiresIn?: number;
} | null> => {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) return null;

  const tokens = await refreshAuthTokens(refreshToken);

  if (!tokens) {
    await clearAuthTokens();
    return null;
  }

  await setAuthTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? refreshToken,
    expiresIn: tokens.expiresIn,
  });

  return {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  };
};

export const POST = async (request: Request): Promise<Response> => {
  const rejected = validateAuthMutation(request);
  if (rejected) return rejected;

  let tokens;

  try {
    tokens = await doRefresh();
  } catch (error) {
    return refreshFailure(error);
  }

  if (!tokens) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Refresh failed' } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  });
};

export const GET = async (request: NextRequest): Promise<Response> => {
  const origin = getAuthOrigin(request);
  if (!origin) return refreshFailure(new Error('Invalid APP_ORIGIN'));

  const next = sanitizeRedirectPath(request.nextUrl.searchParams.get('next'));
  let tokens;

  try {
    tokens = await doRefresh();
  } catch (error) {
    return refreshFailure(error);
  }
  const destination = tokens
    ? next
    : `/login${next !== '/' && next !== '/login' ? `?next=${encodeURIComponent(next)}` : ''}`;

  // Keep the browser's origin: request.url can contain the server's bind address.
  return new NextResponse(null, {
    status: 307,
    headers: { Location: destination },
  });
};

const refreshFailure = (error: unknown): Response =>
  NextResponse.json(
    {
      error: {
        code: 'auth_unavailable',
        message:
          error instanceof ApiError
            ? error.message
            : 'Не удалось обновить сессию. Попробуйте ещё раз.',
      },
    },
    { status: 503 },
  );
