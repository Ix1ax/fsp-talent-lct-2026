import { NextRequest, NextResponse } from 'next/server';
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

/** Client refresh: returns new access token as JSON. */
export const POST = async (): Promise<Response> => {
  const tokens = await doRefresh();

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

/**
 * Server-side recovery for protected layouts: refresh cookies, then redirect.
 * Usage: redirect(`/api/auth/refresh?next=${encodeURIComponent(pathname)}`)
 */
export const GET = async (request: NextRequest): Promise<Response> => {
  const next = sanitizeRedirectPath(request.nextUrl.searchParams.get('next'));
  const tokens = await doRefresh();
  const destination = new URL(tokens ? next : '/login', request.url);

  return NextResponse.redirect(destination);
};

