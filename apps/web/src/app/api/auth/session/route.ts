import { NextRequest, NextResponse } from 'next/server';

import { setAuthTokens } from '@/shared/auth/server';

type SessionBody = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
};

export const POST = async (request: NextRequest): Promise<Response> => {
  let body: SessionBody;

  try {
    body = (await request.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.accessToken || !body.refreshToken) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
  }

  await setAuthTokens({
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresIn: body.expiresIn,
  });

  return NextResponse.json({ ok: true });
};
