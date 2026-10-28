import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';

const SessionContext = createContext(null);

const ANONYMOUS = { status: 'anonymous', user: null, permissions: [] };

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => (getToken() ? { ...ANONYMOUS, status: 'loading' } : ANONYMOUS));

  const clear = useCallback(() => {
    setToken(null);
    setSession(ANONYMOUS);
  }, []);

  const refresh = useCallback(
    () =>
      api('/me').then(
        (me) => setSession({ status: 'authenticated', user: me.user, permissions: me.permissions }),
        clear
      ),
    [clear]
  );

  useEffect(() => {
    setUnauthorizedHandler(clear);
    if (getToken()) refresh();
  }, [clear, refresh]);

  const startSession = async (path, body) => {
    const { token } = await api(path, { method: 'POST', body });
    setToken(token);
    await refresh();
  };

  const value = {
    ...session,
    login: (email, password) => startSession('/auth/login', { email, password }),
    register: (name, email, password) => startSession('/auth/register', { name, email, password }),
    logout: async () => {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
      clear();
    },
    refresh,
    can: (perm) => session.permissions.includes(perm),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

export function useApi(path) {
  const { user } = useSession();
  const identity = `${user?.id}:${user?.role}`;
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api(path).then(
      (data) => setState({ data, error: null, loading: false }),
      (err) => setState({ data: null, error: err.message, loading: false })
    );
  }, [path, identity]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
