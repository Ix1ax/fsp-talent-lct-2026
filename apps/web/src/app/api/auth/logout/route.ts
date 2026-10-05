import { NextResponse } from 'next/server';

import { clearAuthTokens } from '@/shared/auth/server';

export async function POST() {
  await clearAuthTokens();
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  await clearAuthTokens();
  return NextResponse.redirect(new URL('/', request.url));
}
