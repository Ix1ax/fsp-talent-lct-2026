import { NextRequest, NextResponse } from 'next/server';

import { validateAuthMutation } from '@/shared/auth/request.server';
import { setAuthTokens } from '@/shared/auth/server';
import { isObject } from '@/shared/utils';

type SessionBody = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  idToken?: string;
};

const isSessionBody = (body: unknown): body is SessionBody => {
  if (!isObject(body)) return false;
  for (const token of [body.accessToken, body.refreshToken]) {
    if (
      typeof token !== 'string' ||
      !token.trim() ||
      /[\u0000-\u0020\u007f]/.test(token)
    )
      return false;
  }
  if (
    body.idToken !== undefined &&
    (typeof body.idToken !== 'string' ||
      /[\u0000-\u0020\u007f]/.test(body.idToken))
  )
    return false;
  if (body.expiresIn === undefined) return true;
  return (
    typeof body.expiresIn === 'number' &&
    Number.isSafeInteger(body.expiresIn) &&
    body.expiresIn > 0
  );
};

export const POST = async (request: NextRequest): Promise<Response> => {
  const rejected = validateAuthMutation(request, true);
  if (rejected) return rejected;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'validation_error', message: 'Некорректный JSON' } },
      { status: 400 },
    );
  }

  if (!isSessionBody(body)) {
    return NextResponse.json(
      {
        error: {
          code: 'validation_error',
          message: 'Нужны строковые токены и положительный целый expiresIn',
        },
      },
      { status: 400 },
    );
  }

  await setAuthTokens({
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    expiresIn: body.expiresIn,
    idToken: body.idToken || undefined,
  });

  return NextResponse.json({ ok: true });
};
