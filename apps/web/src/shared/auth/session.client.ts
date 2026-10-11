let accessToken: string | null = null;
let sessionRevision = 0;
let signingOut = false;

export const getClientSessionRevision = (): number => sessionRevision;

type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** In-memory access token for browser requests (refresh stays in httpOnly cookie). */
export const getClientAccessToken = (): string | null => {
  return accessToken;
};

export const setClientAccessToken = (token: string | null): void => {
  sessionRevision += 1;
  accessToken = token;
};

export const clearClientAccessToken = (): void => {
  sessionRevision += 1;
  accessToken = null;
};

export const onSessionExpired = (
  listener: SessionExpiredListener,
): (() => void) => {
  sessionExpiredListeners.add(listener);

  return () => {
    sessionExpiredListeners.delete(listener);
  };
};

/**
 * Идёт выход: cookie уже очищены, браузер вот-вот уйдёт в Keycloak. Фоновые
 * запросы получат 401 — не отправляем на /login, иначе он мелькнёт.
 */
export const setSigningOut = (value: boolean): void => {
  signingOut = value;
};

export const emitSessionExpired = (): void => {
  if (signingOut) return;
  for (const listener of sessionExpiredListeners) {
    listener();
  }
};
