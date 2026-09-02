import { describe, expect, it } from 'vitest';
import { readSupabaseOAuthCallback } from '@/api/authService';
import { isEmailVerificationError, isInvalidCredentialsError } from './authErrorUtils';

describe('authErrorUtils', () => {
  it('detects verification errors in English and French', () => {
    expect(isEmailVerificationError({ status: 403 })).toBe(true);
    expect(isEmailVerificationError(new Error('Email not verified. Confirmez votre adresse e-mail avant de vous connecter.'))).toBe(true);
    expect(isEmailVerificationError(new Error('Votre adresse e-mail n\'est pas vérifiée. Confirmez votre adresse e-mail.'))).toBe(true);
    expect(isEmailVerificationError(new Error('Identifiants incorrects'))).toBe(false);
  });

  it('detects invalid-credential errors across locales', () => {
    expect(isInvalidCredentialsError({ status: 401 })).toBe(true);
    expect(isInvalidCredentialsError(new Error('Invalid credentials'))).toBe(true);
    expect(isInvalidCredentialsError(new Error('Identifiants incorrects'))).toBe(true);
    expect(isInvalidCredentialsError(new Error('Email not verified'))).toBe(false);
  });

  it('reads Supabase OAuth callback data from both hash and query params', () => {
    expect(readSupabaseOAuthCallback('https://example.com/login#access_token=abc123')).toMatchObject({
      accessToken: 'abc123',
      code: null,
      errorDescription: null,
    });

    expect(readSupabaseOAuthCallback('https://example.com/login?code=def456')).toMatchObject({
      accessToken: null,
      code: 'def456',
      errorDescription: null,
    });

    expect(readSupabaseOAuthCallback('https://example.com/login?error_description=access_denied')).toMatchObject({
      accessToken: null,
      code: null,
      errorDescription: 'access_denied',
    });
  });
});
