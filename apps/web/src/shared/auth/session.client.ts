let accessToken: string | null = null;

type SessionExpiredListener = () => void;

const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** In-memory access token for browser requests (refresh stays in httpOnly cookie). */
export const getClientAccessToken = (): string | null => {
  return accessToken;
};

export const setClientAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const clearClientAccessToken = (): void => {
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
