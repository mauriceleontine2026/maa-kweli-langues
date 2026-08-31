import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});
