const getText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// Работает и на сервере, и в браузере (там нет Buffer).
const decodeBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const getTokenDisplayName = (token: string): string | undefined => {
  try {
    const payload = token.split('.')[1];

    if (!payload) return undefined;
    const claims = JSON.parse(decodeBase64Url(payload));

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
