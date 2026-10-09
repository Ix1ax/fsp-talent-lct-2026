import 'server-only';

import { NextResponse } from 'next/server';

const parseOrigin = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
};

// APP_ORIGIN is the public browser origin when the proxy uses an internal URL.
// Forwarded headers are deliberately not a source of trust.
export const getAuthOrigin = (request: Request): string | null => {
  if (process.env.APP_ORIGIN !== undefined)
    return parseOrigin(process.env.APP_ORIGIN);
  const url = new URL(request.url);
  if (url.hostname === '0.0.0.0' || url.hostname === '::') {
    const host = request.headers.get('host');
    if (host) return parseOrigin(`${url.protocol}//${host}`);
  }
  return url.origin;
};

export const validateAuthMutation = (
  request: Request,
  requireJson = false,
): Response | null => {
  const trustedOrigin = getAuthOrigin(request);
  if (!trustedOrigin)
    return NextResponse.json(
      {
        error: {
          code: 'auth_unavailable',
          message: 'Адрес приложения настроен некорректно',
        },
      },
      { status: 503 },
    );

  const origin = request.headers.get('origin');
  if (!origin || parseOrigin(origin) !== trustedOrigin)
    return NextResponse.json(
      {
        error: {
          code: 'forbidden_origin',
          message: 'Источник запроса не разрешён',
        },
      },
      { status: 403 },
    );

  const mediaType = request.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();
  if (requireJson && mediaType !== 'application/json')
    return NextResponse.json(
      {
        error: {
          code: 'unsupported_media_type',
          message: 'Ожидается application/json',
        },
      },
      { status: 415 },
    );

  return null;
};
