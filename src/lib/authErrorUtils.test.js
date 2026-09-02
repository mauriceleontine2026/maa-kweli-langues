import { describe, expect, it } from 'vitest';
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
});
