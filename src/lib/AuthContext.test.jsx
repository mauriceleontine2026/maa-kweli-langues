import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getApiBaseUrl } from '../api/backendClient';
import { getStoredUser, persistUser } from './AuthContext';

describe('Auth persistence', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    const sessionStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    const localStorage = {
      getItem: (key) => (key === 'mbaara_user' ? JSON.stringify({ id: 'user-1', email: 'demo@example.com' }) : null),
      setItem: () => {},
      removeItem: () => {},
    };

    global.window = {
      localStorage,
      sessionStorage,
    };
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('reads the cached user from localStorage so the login survives a browser restart', () => {
    expect(getStoredUser()).toMatchObject({ id: 'user-1', email: 'demo@example.com' });
  });

  it('writes the cached user to localStorage when the session changes', () => {
    const stored = {};
    global.window.localStorage.setItem = (key, value) => {
      stored[key] = value;
    };

    persistUser({ id: 'user-2', email: 'next@example.com' });

    expect(JSON.parse(stored.mbaara_user)).toMatchObject({ id: 'user-2', email: 'next@example.com' });
  });

  it('uses the backend domain on Vercel deployments instead of the frontend origin', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');

    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'maa-kweli-langues.vercel.app',
        origin: 'https://maa-kweli-langues.vercel.app',
      },
      configurable: true,
    });

    expect(getApiBaseUrl()).toBe('https://mbaara-backend.vercel.app');
    vi.unstubAllEnvs();
  });
});
