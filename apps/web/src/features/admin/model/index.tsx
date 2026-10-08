'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  AdminApiError,
  adminLogin,
  adminLogout,
  adminMe,
  type AdminSession,
  loginSchema,
} from '@/entities/admin';

const storageKey = 'fsp.admin.session';
type SessionContext = {
  session: AdminSession | null;
  loading: boolean;
  error: unknown;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
};
const Context = createContext<SessionContext | null>(null);
interface AdminProviderProps {
  children: ReactNode;
}
export const AdminProvider = ({ children }: AdminProviderProps) => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const clear = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setSession(null);
    setError(null);
    setLoading(false);
  }, []);
  useEffect(() => {
    window.addEventListener('admin:expired', clear);
    return () => window.removeEventListener('admin:expired', clear);
  }, [clear]);
  useEffect(() => {
    const controller = new AbortController();
    const restore = async () => {
      setLoading(true);
      setError(null);
      let saved: unknown;
      try {
        saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      } catch {
        clear();
        return;
      }
      const parsed = loginSchema.safeParse(saved);
      if (!parsed.success || Date.parse(parsed.data.expires_at) <= Date.now()) {
        clear();
        return;
      }
      try {
        const admin = await adminMe(
          parsed.data.access_token,
          controller.signal,
        );
        if (!controller.signal.aborted) setSession({ ...parsed.data, admin });
      } catch (err) {
        if (
          !controller.signal.aborted &&
          !(err instanceof AdminApiError && err.status === 401)
        )
          setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void restore();
    return () => controller.abort();
  }, [clear, revision]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(
      clear,
      Math.max(0, Date.parse(session.expires_at) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [clear, session]);
  const login = async (email: string, password: string) => {
    const next = await adminLogin(email, password);
    sessionStorage.setItem(storageKey, JSON.stringify(next));
    setSession(next);
    setError(null);
  };
  const logout = async () => {
    try {
      if (session) await adminLogout(session.access_token);
    } finally {
      clear();
    }
  };
  return (
    <Context.Provider
      value={{
        session,
        loading,
        error,
        login,
        logout,
        retry: () => setRevision((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
};
export const useAdminSession = () => {
  const context = useContext(Context);
  if (!context) throw new Error('AdminProvider отсутствует');
  return context;
};
