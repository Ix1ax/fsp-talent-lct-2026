import { createHash, randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// HTTP by IP has no browser crypto.subtle. Keep S256 PKCE using server crypto.
export const GET = (): Response => {
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return NextResponse.json(
    { verifier, challenge },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};
