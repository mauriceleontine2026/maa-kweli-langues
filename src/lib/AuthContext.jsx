import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser, logout as logoutService, restoreBackendSession } from '@/api/authService';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = "mbaara_user";

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;

  const storageCandidates = [window.localStorage, window.sessionStorage];

  for (const storage of storageCandidates) {
    if (!storage) continue;
    try {
      const raw = storage.getItem(USER_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Ignore invalid cached payloads and fall back to the next store.
    }
  }

  return null;
};

export const persistUser = (user) => {
  if (typeof window === "undefined") return;

  const storageCandidates = [window.localStorage, window.sessionStorage];

  if (user) {
    for (const storage of storageCandidates) {
      if (!storage) continue;
      try {
        storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } catch {
        // Ignore storage quota / unavailable storage errors. The backend cookie
        // remains the authoritative session, while the client cache is best-effort.
      }
    }
    return;
  }

  for (const storage of storageCandidates) {
    if (!storage) continue;
    try {
      storage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures from unavailable storage.
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAppState();

    if (typeof window !== "undefined") {
      const onAuthChanged = (event) => {
        const authenticatedUser = event?.detail;
        if (authenticatedUser?.id || authenticatedUser?.email) {
          setUser(authenticatedUser);
          setIsAuthenticated(true);
          persistUser(authenticatedUser);
        }
        checkUserAuth();
      };
      window.addEventListener("mbaara-auth-changed", onAuthChanged);
      return () => {
        window.removeEventListener("mbaara-auth-changed", onAuthChanged);
      };
    }
    return undefined;
  }, []);

  const checkAppState = async () => {
    setAuthError(null);
    await checkUserAuth();
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      let currentUser;
      try {
        currentUser = await getCurrentUser();
      } catch (error) {
        if (error?.status !== 401 && error?.status !== 403) throw error;
        currentUser = await restoreBackendSession();
        if (!currentUser) throw error;
      }
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      persistUser(currentUser);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mbaara-user-updated'));
        window.dispatchEvent(new Event('mbaara-progress-updated'));
      }
    } catch (error) {
      const status = error?.status ?? (error instanceof Error ? null : null);
      const isAuthenticationFailure = status === 401 || status === 403;
      setUser(null);
      setIsAuthenticated(false);
      persistUser(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mbaara-user-updated'));
        window.dispatchEvent(new Event('mbaara-progress-updated'));
      }
      if (isAuthenticationFailure) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      } else {
        setAuthError({ type: 'unknown', message: error?.message || 'Failed to verify authentication' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const updateUser = (updates) => {
    setUser((currentUser) => {
      const nextUser = currentUser ? { ...currentUser, ...updates } : currentUser;
      persistUser(nextUser);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mbaara-user-updated"));
      }
      return nextUser;
    });
  };

  const logout = async () => {
    try {
      await logoutService();
    } catch (err) {
      // If the network/logout call fails, still clear client state so the
      // user is logged out in the UI. The backend will eventually expire
      // server-side cookies/tokens.
      console.warn("Logout request failed:", err);
    }
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setAuthChecked(true);
    persistUser(null);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
