const getText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const getTokenDisplayName = (token: string): string | undefined => {
  try {
    const payload = token.split('.')[1];

    if (!payload) return undefined;
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );

    if (!claims || typeof claims !== 'object') return undefined;

    return (
      getText(claims.name) ||
      [getText(claims.given_name), getText(claims.family_name)]
        .filter(Boolean)
        .join(' ') ||
      undefined
    );
  } catch {
    return undefined;
  }
};
