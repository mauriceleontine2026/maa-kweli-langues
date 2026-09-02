const normalizeErrorText = (errorLike) => {
  if (!errorLike) return "";
  if (typeof errorLike === "string") return errorLike.trim();

  const raw =
    errorLike?.message ||
    errorLike?.detail ||
    errorLike?.error ||
    "";

  return String(raw || "").trim();
};

export const isEmailVerificationError = (errorLike) => {
  const raw = normalizeErrorText(errorLike).toLowerCase();
  if (!raw) {
    return Boolean(errorLike?.status === 403);
  }

  const verificationPatterns = [
    "email not verified",
    "email non vérifié",
    "email non verifie",
    "adresse e-mail non vérifiée",
    "adresse e-mail non verifiee",
    "confirmez votre adresse e-mail",
    "confirm your email",
    "veuillez confirmer votre adresse",
    "verification required",
    "vérification requise",
    "vérification obligatoire",
    "not verified",
    "doit être vérifiée",
    "à vérifier avant",
  ];

  return verificationPatterns.some((pattern) => raw.includes(pattern)) || Boolean(errorLike?.status === 403);
};

export const isInvalidCredentialsError = (errorLike) => {
  const raw = normalizeErrorText(errorLike).toLowerCase();
  if (!raw) {
    return Boolean(errorLike?.status === 401);
  }

  const invalidCredentialPatterns = [
    "invalid credentials",
    "identifiants incorrects",
    "identifiants invalides",
    "email ou mot de passe incorrect",
    "e-mail ou mot de passe incorrect",
    "mot de passe incorrect",
    "wrong password",
    "incorrect password",
    "invalid password",
  ];

  return invalidCredentialPatterns.some((pattern) => raw.includes(pattern)) || Boolean(errorLike?.status === 401);
};
