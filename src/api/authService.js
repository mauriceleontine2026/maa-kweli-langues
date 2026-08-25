import { request, notifyAuthChanged, setInMemoryAccessToken } from "./backendClient";
import supabase, { signInWithGoogle } from "./supabaseClient";

const PROD_BACKEND_FALLBACK = "https://mbaara-backend.vercel.app";

export const getAuthApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const normalizedConfigured = configuredBaseUrl && String(configuredBaseUrl).trim();

  if (normalizedConfigured) {
    try {
      return new URL(normalizedConfigured).origin.replace(/\/$/, "");
    } catch {
      return typeof window !== "undefined" ? window.location.origin : PROD_BACKEND_FALLBACK;
    }
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.endsWith(".vercel.app") || hostname.endsWith(".web.app")) {
      return PROD_BACKEND_FALLBACK;
    }
    return window.location.origin;
  }

  return PROD_BACKEND_FALLBACK;
};

const clearUrlHash = () => {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  window.history.replaceState({}, document.title, `${pathname}${search}`);
};

const getSupabaseAccessTokenFromUrl = async () => {
  if (typeof window === "undefined") return null;

  const parseParams = (source) => {
    const raw = source.startsWith("#") || source.startsWith("?") ? source.slice(1) : source;
    return new URLSearchParams(raw);
  };

  let access_token = null;
  let error_description = null;

  const hashParams = parseParams(window.location.hash || "");
  access_token = hashParams.get("access_token");
  error_description = hashParams.get("error_description") || hashParams.get("error");

  const searchParams = parseParams(window.location.search || "");
  const code = searchParams.get("code");
  if (!access_token && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw new Error(error.message || error_description || "Impossible de terminer la connexion Google.");
    }
    access_token = data?.session?.access_token;
  }

  // Supabase normally exchanges the PKCE `code` automatically while the
  // client initializes. Read that session first so the code is not exchanged
  // a second time by this callback handler.
  if (!access_token) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message || "Impossible de lire la session Google.");
    }
    access_token = data?.session?.access_token;
  }

  if (!access_token) {
    access_token = searchParams.get("access_token");
    error_description = error_description || searchParams.get("error_description") || searchParams.get("error");
  }

  if (!access_token) {
    if (window.location.hash) {
    const { data, error } = await supabase.auth.getSessionFromUrl();
    if (error) {
      throw new Error(error.message || error_description || "Impossible de lire la session Supabase après redirection Google.");
    }
    access_token = data?.session?.access_token;
    }
  }

  return access_token;
};

export async function completeGoogleLogin() {
  try {
    const access_token = await getSupabaseAccessTokenFromUrl();
    if (!access_token) {
      throw new Error("Aucun jeton Supabase trouvé après la redirection Google.");
    }

    const data = await request("POST", "/api/auth/supabase", { access_token });
    const user = await syncSupabaseProfilePhoto(data?.user);
    notifyAuthChanged();
    clearUrlHash();
    return user;
  } catch (err) {
    clearUrlHash();
    throw err;
  }
}

async function syncSupabaseProfilePhoto(user) {
  if (!user?.id) return user || null;

  const { data: sessionData } = await supabase.auth.getSession();
  const metadata = sessionData?.session?.user?.user_metadata || {};
  const photoUrl = metadata.avatar_url || metadata.picture || null;
  if (!photoUrl || user.photo_url) return user;

  try {
    return await request("PUT", "/api/auth/me", { photo_url: photoUrl });
  } catch {
    // Authentication remains valid even when an avatar provider blocks the update.
    return { ...user, photo_url: photoUrl };
  }
}

export async function login(email, password, remember = false) {
  try {
    const data = await request("POST", "/api/auth/login", { email, password, remember });
    notifyAuthChanged();
    return data?.user || null;
  } catch (err) {
    const message = err?.message || "";
    const status = err?.status;
    // If network error or CORS issue, retry with form-based fallback
    if (message.includes("Failed to fetch") || status === 0 || !status) {
      console.warn("Login XHR failed, attempting form-based login fallback...");
      return loginWithForm(email, password, remember);
    }
    throw err;
  }
}

/**
 * Form-based login fallback: submits email/password using FormData to
 * `/api/auth/login/form` and returns the authenticated user if successful.
 */
export async function loginWithForm(email, password, remember = false) {
  const url = `${getAuthApiBaseUrl()}/api/auth/login/form`;
  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);
  formData.append("remember", String(remember));

  // Include CSRF token from cookie when available (double-submit cookie pattern)
  try {
    const csrfCookie = getCsrfTokenFromCookie();
    if (csrfCookie) {
      formData.append("_csrf_token", csrfCookie);
    }
  } catch (e) {
    // ignore cookie read errors
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
      mode: "cors",
    });
  } catch (fetchError) {
    const detail = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`Impossible de contacter le serveur de connexion. Vérifiez votre connexion et réessayez. (${detail})`);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Form login failed with status ${response.status}`);
  }

  const data = await response.json();
  notifyAuthChanged();
  return data?.user || null;
}

export async function loginWithGoogle() {
  const { token } = await signInWithGoogle();
  if (!token) {
    // Redirect flow will complete after the user returns to /login.
    return null;
  }

  // Quick health check to provide a clearer error if the backend is unreachable
  try {
    await request("GET", "/api/health");
  } catch (err) {
    throw new Error(
      `Impossible de contacter le backend avant l'échange du jeton Supabase. Vérifiez la configuration de \
      VITE_API_BASE_URL et la connectivité réseau. Détails: ${err?.message || err}`
    );
  }

  let data;
  try {
    // Exchange the Supabase access token with the backend to create a server-side
    // session (backend must implement /api/auth/supabase to accept and verify).
    data = await request("POST", "/api/auth/supabase", { access_token: token });
  } catch (err) {
    // If XHR fetch fails with "Failed to fetch", fallback to form-based auth
    if (err?.message && err.message.includes("Failed to fetch")) {
      console.warn("XHR CORS failed, attempting form-based auth fallback...");
      return loginWithGoogleForm(token);
    }
    // Provide actionable guidance when the network request itself failed
    if (err?.message && err.message.includes("Impossible de contacter le serveur")) {
      throw new Error(
        `Échec de l'appel à ${import.meta.env.VITE_API_BASE_URL || window.location.origin}/api/auth/supabase — ${err.message}`
      );
    }
    throw err;
  }
  notifyAuthChanged();
  return data?.user || null;
}

/**
 * Helper: extract CSRF token from browser cookies
 */
function getCsrfTokenFromCookie() {
  const CSRF_COOKIE_NAME = "mbaara_csrf_token";
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Form-based Supabase auth: submits a hidden form to /api/auth/supabase/form
 * with access_token as application/x-www-form-urlencoded data.
 * This bypasses XHR CORS restrictions and relies on browser cookie handling.
 */
export async function loginWithGoogleForm(accessToken) {
  const url = `${getAuthApiBaseUrl()}/api/auth/supabase/form`;
  const formData = new FormData();
  formData.append("access_token", accessToken);

  const csrfCookie = getCsrfTokenFromCookie();
  if (csrfCookie) {
    formData.append("_csrf_token", csrfCookie);
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
    mode: "cors",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Form auth failed with status ${response.status}`);
  }

  const data = await response.json();
  notifyAuthChanged();
  return data?.user || null;
}

export async function register(email, password, full_name) {
  try {
    const data = await request("POST", "/api/auth/register", { email, password, full_name });
    return data;
  } catch (err) {
    const message = err?.message || "";
    const status = err?.status;
    // Retry with form-based fallback on network/CORS/CSRF failures
    if (message.includes("Failed to fetch") || status === 0 || !status || message.includes("CSRF token")) {
      console.warn("Register XHR failed, attempting form-based register fallback...");
      return registerWithForm(email, password, full_name);
    }
    throw err;
  }
}

/**
 * Form-based registration fallback: submits form to `/api/auth/register/form`.
 */
export async function registerWithForm(email, password, full_name) {
  const url = `${getAuthApiBaseUrl()}/api/auth/register/form`;
  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);
  if (full_name) formData.append("full_name", full_name);


  try {
    const csrfCookie = getCsrfTokenFromCookie();
    if (csrfCookie) formData.append("_csrf_token", csrfCookie);
  } catch (e) {}

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
      mode: "cors",
    });
  } catch (fetchError) {
    const detail = fetchError instanceof Error ? fetchError.message : String(fetchError);
    throw new Error(`Impossible de contacter le serveur d'inscription. Vérifiez votre connexion et réessayez. (${detail})`);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const error = new Error(err.detail || `Form register failed with status ${response.status}`);
    error.status = response.status;
    error.data = err;
    throw error;
  }

  const data = await response.json();
  return data;
}

export async function verifyEmail(token) {
  const data = await request("POST", "/api/auth/verify-email", { resetToken: token });
  notifyAuthChanged();
  return data;
}

export async function requestEmailVerification(email) {
  return await request("POST", "/api/auth/verify-email-request", { email });
}

export async function getCurrentUser() {
  return await request("GET", "/api/auth/me");
}

export async function restoreBackendSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) return null;
  const response = await request("POST", "/api/auth/supabase", {
    access_token: data.session.access_token,
  });
  notifyAuthChanged();
  return response?.user || null;
}

export async function updateMe(payload) {
  return await request("PUT", "/api/auth/me", payload);
}

export async function logout() {
  try {
    await request("POST", "/api/auth/logout");
    setInMemoryAccessToken(null);
    notifyAuthChanged();
    return;
  } catch (err) {
    const message = err?.message || "";
    const status = err?.status;
    if (message.includes("Failed to fetch")) {
      console.warn("XHR CORS failed for logout, attempting form-based logout fallback...");
      await logoutWithForm();
      setInMemoryAccessToken(null);
      return;
    }
    if (status === 403 || message.includes("CSRF token missing or invalid")) {
      console.warn("Logout CSRF failed, retrying with form-based logout fallback...");
      await logoutWithForm();
      setInMemoryAccessToken(null);
      return;
    }
    throw err;
  }
}

/**
 * Form-based logout: submits a hidden form to /api/auth/logout/form
 * This bypasses XHR CORS restrictions.
 */
export async function logoutWithForm() {
  const url = `${import.meta.env.VITE_API_BASE_URL || window.location.origin}/api/auth/logout/form`;
  const formData = new FormData();

  const csrfCookie = getCsrfTokenFromCookie();
  if (csrfCookie) {
    formData.append("_csrf_token", csrfCookie);
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
    mode: "cors",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Form logout failed with status ${response.status}`);
  }

  notifyAuthChanged();
  return { status: "ok" };
}

export async function resetPasswordRequest(email) {
  return await request("POST", "/api/auth/reset-password-request", { email });
}

export async function resetPassword(resetToken, newPassword) {
  return await request("POST", "/api/auth/reset-password", { resetToken, newPassword });
}
