import { NextResponse } from 'next/server';

import { validateAuthMutation } from '@/shared/auth/request.server';
import { clearAuthTokens } from '@/shared/auth/server';

export const POST = async (request: Request): Promise<Response> => {
  const rejected = validateAuthMutation(request);
  if (rejected) return rejected;

  await clearAuthTokens();

  return NextResponse.json({ ok: true });
};

export const GET = (): Response =>
  NextResponse.json(
    {
      error: {
        code: 'method_not_allowed',
        message: 'Для выхода используйте POST',
      },
    },
    { status: 405, headers: { Allow: 'POST' } },
  );
