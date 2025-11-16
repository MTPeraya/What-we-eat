import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { config } from '../config';

const AuthContext = createContext({
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  authChecked: false,
  loading: false,
  refreshAuth: async () => {}
});

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    authChecked: false,
    loading: false
  });

  const refreshAuth = useCallback(async () => {
    console.log('[AuthContext] Refreshing auth...');
    setState(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch(`${config.endpoints.auth}/me`, {
        credentials: 'include'
      });
      console.log('[AuthContext] /me status:', res.status);

      let data = null;
      try {
        data = await res.json();
      } catch (err) {
        console.warn('[AuthContext] Failed to parse /me response:', err);
      }

      if (!res.ok) {
        console.warn('[AuthContext] /me returned error:', data?.error);
        setState({
          user: null,
          authChecked: true,
          loading: false
        });
        return;
      }

      console.log('[AuthContext] User payload:', data?.user || null);
      setState({
        user: data?.user || null,
        authChecked: true,
        loading: false
      });
    } catch (error) {
      console.error('[AuthContext] Failed to fetch auth status:', error);
      setState({
        user: null,
        authChecked: true,
        loading: false
      });
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const value = useMemo(() => ({
    user: state.user,
    isLoggedIn: Boolean(state.user),
    isAdmin: state.user?.role === 'ADMIN',
    authChecked: state.authChecked,
    loading: state.loading,
    refreshAuth
  }), [state, refreshAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

