import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { config } from '../config';

export const AuthContext = createContext({
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
      const authUrl = `${config.endpoints.auth}/me`;
      console.log('[AuthContext] Fetching from:', authUrl);
      
      const res = await fetch(authUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      }).catch((fetchError) => {
        // Handle network errors (server down, CORS, etc.)
        console.warn('[AuthContext] Network error:', fetchError.message);
        throw fetchError;
      });

      console.log('[AuthContext] /me status:', res.status);

      // Handle empty responses
      if (!res.ok && res.status === 0) {
        console.warn('[AuthContext] Empty response - backend may be unavailable');
        setState({
          user: null,
          authChecked: true,
          loading: false
        });
        return;
      }

      let data = null;
      try {
        const text = await res.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (err) {
        console.warn('[AuthContext] Failed to parse /me response:', err);
      }

      if (!res.ok) {
        console.warn('[AuthContext] /me returned error:', data?.error || `Status ${res.status}`);
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
      // Silently handle auth errors - don't block UI
      console.warn('[AuthContext] Failed to fetch auth status (non-blocking):', error.message || error);
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

