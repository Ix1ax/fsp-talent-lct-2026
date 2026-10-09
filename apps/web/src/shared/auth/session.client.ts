let accessToken: string | null = null;
let sessionRevision = 0;

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

export const emitSessionExpired = (): void => {
  for (const listener of sessionExpiredListeners) {
    listener();
  }
};
