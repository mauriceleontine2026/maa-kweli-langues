const PROD_BACKEND_FALLBACK = "https://mbaara-backend.vercel.app";
let inMemoryAccessToken = null;

const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const normalizedConfigured = configuredBaseUrl && String(configuredBaseUrl).trim();

  if (typeof window !== "undefined") {
    const currentOrigin = window.location.origin;
    const currentHost = new URL(currentOrigin).host;

    if (normalizedConfigured) {
      try {
        const parsed = new URL(normalizedConfigured);
        const parsedHost = parsed.host;

        // In Vercel deployments, the app's /api route is already proxied through
        // the same origin. Prefer that proxy to avoid stale backend URLs such as
        // the old frontend host or an outdated alias.
        const staleHosts = new Set([
          "maa-kweli-langues.vercel.app",
          "mbaara-backend-m6hbjeb7i-m-baara-langues.vercel.app",
        ]);

        if (parsedHost === currentHost || staleHosts.has(parsedHost)) {
          return currentOrigin;
        }

        return normalizedConfigured.replace(/\/$/, "");
      } catch {
        return currentOrigin;
      }
    }

    return currentOrigin;
  }

  return normalizedConfigured ? normalizedConfigured.replace(/\/$/, "") : PROD_BACKEND_FALLBACK;
};

// The access token itself now lives only in an httpOnly cookie the backend
// sets on login (see backend/app/services/security.py:set_auth_cookies) —
// JS never reads or stores it, so an XSS payload can't exfiltrate it from
// storage. Every request is sent with credentials so the browser attaches
// that cookie automatically; login/register calls still notify listeners so
// the rest of the app (AuthContext) knows to re-check "who am I".
const CSRF_COOKIE_NAME = "mbaara_csrf_token";

const getCsrfToken = () => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const notifyAuthChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("mbaara-auth-changed"));
  }
};

const setInMemoryAccessToken = (token) => {
  inMemoryAccessToken = typeof token === "string" && token ? token : null;
};

const buildApiUrl = (path) => {
  const API_BASE_URL = getApiBaseUrl();
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured. Set it to your deployed backend base URL.");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  try {
    return new URL(normalizedPath, `${API_BASE_URL}/`);
  } catch {
    const fallback = typeof window !== "undefined" ? window.location.origin : "";
    if (!fallback) throw new Error("URL de l’API invalide.");
    return new URL(normalizedPath, `${fallback}/`);
  }
};

const formatErrorMessage = (data, fallback) => {
  const normalizeErrorMessage = (message) => {
    if (!message || typeof message !== "string") return null;
    return message.trim();
  };

  if (typeof data === "string" && data.trim()) {
    return normalizeErrorMessage(data.trim()) || data.trim();
  }

  if (Array.isArray(data?.detail)) {
    const first = data.detail[0];
    const message = typeof first?.msg === "string" ? first.msg.trim() : null;
    if (message) {
      return normalizeErrorMessage(message) || message;
    }
  }

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return normalizeErrorMessage(data.detail.trim()) || data.detail.trim();
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return normalizeErrorMessage(data.message.trim()) || data.message.trim();
  }

  return fallback;
};

const getResponseErrorMessage = (response, data, url) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    return `Le serveur API a renvoyé une page HTML au lieu d'une réponse JSON (HTTP ${response.status}). Vérifiez le déploiement de l'API : ${url}`;
  }

  const message = formatErrorMessage(data, "");
  if (message) return message;

  return `La requête API a échoué (HTTP ${response.status} ${response.statusText || "sans détail"}) : ${url}`;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const request = async (method, path, body, queryParams) => {
  const url = buildApiUrl(path);
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  /** @type {{ [key: string]: string }} */
  const headers = {
    Accept: "application/json",
  };
  if (inMemoryAccessToken) {
    headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  if (MUTATING_METHODS.has(method.toUpperCase())) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  let bodyValue;
  if (body && !(body instanceof FormData)) {
    Object.assign(headers, { "Content-Type": "application/json" });
    bodyValue = JSON.stringify(body);
  } else {
    bodyValue = body;
  }

  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body: bodyValue,
      credentials: "include",
      mode: "cors",
      cache: "no-store",
    });
  } catch (fetchError) {
    const message =
      fetchError instanceof Error
        ? fetchError.message
        : String(fetchError);
    throw new Error(
      `Impossible de contacter le serveur (${method} ${url.toString()}). Vérifiez votre connexion réseau et l'URL du backend. (${message})`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(getResponseErrorMessage(response, data, url.toString()));
    Object.assign(error, {
      status: response.status,
      data,
      url: url.toString(),
    });
    throw error;
  }

  if (path === "/api/auth/supabase" && data?.access_token) {
    setInMemoryAccessToken(data.access_token);
  }

  return data;
};

export { notifyAuthChanged, request, setInMemoryAccessToken };
