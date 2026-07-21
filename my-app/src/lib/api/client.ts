import { apiConfig } from "./config";
import { parseApiError, unwrapData } from "./envelope";
import { tokens } from "./tokens";

let refreshPromise: Promise<boolean> | null = null;

/** Shared fetch headers — includes ngrok bypass for free-tier tunnels. */
function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };

  if (apiConfig.isNgrok) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const access = tokens.access;
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  return headers;
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;

  try {
    const res = await fetch(`${apiConfig.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ refresh_token: refresh }),
      credentials: "include",
    });
    if (!res.ok) return false;
    const json = await res.json();
    const data = unwrapData<{ access_token: string; refresh_token: string }>(json);
    tokens.set(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function request<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  const extra = init?.headers as Record<string, string> | undefined;
  const headers = buildHeaders(extra);

  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers,
    // Carry the POS device cookie on any /v1 call; harmless for bearer-auth
    // portal routes, and required cross-origin once the server allows credentials.
    credentials: "include",
  });

  if (res.status === 401 && !retried && tokens.refresh) {
    const refreshed = await refreshOnce();
    if (refreshed) return request<T>(path, init, true);
    tokens.clear();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw parseApiError(body, res.status);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  return unwrapData<T>(json);
}

/**
 * Like `request`, but keeps the envelope's `meta` — list endpoints return
 * pagination there rather than in `data`.
 */
export async function requestEnvelope<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const extra = init?.headers as Record<string, string> | undefined;
  const headers = buildHeaders(extra);

  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers,
    // Carry the POS device cookie on any /v1 call; harmless for bearer-auth
    // portal routes, and required cross-origin once the server allows credentials.
    credentials: "include",
  });

  if (res.status === 401 && !retried && tokens.refresh) {
    const refreshed = await refreshOnce();
    if (refreshed) return requestEnvelope<T>(path, init, true);
    tokens.clear();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw parseApiError(body, res.status);
  }

  const json = await res.json();
  const meta =
    json !== null && typeof json === "object" && "meta" in json
      ? (json as { meta?: Record<string, unknown> }).meta
      : undefined;

  return { data: unwrapData<T>(json), meta };
}

/** Upload a file via multipart/form-data with the same auth/refresh behavior. */
export async function requestUpload<T>(
  path: string,
  body: FormData,
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (apiConfig.isNgrok) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  const access = tokens.access;
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    method: "POST",
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 401 && !retried && tokens.refresh) {
    const refreshed = await refreshOnce();
    if (refreshed) return requestUpload<T>(path, body, true);
    tokens.clear();
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw parseApiError(json, res.status);
  }

  const json = await res.json();
  return unwrapData<T>(json);
}

/** Fetch non-JSON responses (e.g. CSV export) with the same auth/refresh behavior. */
export async function requestText(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<string> {
  const extra = init?.headers as Record<string, string> | undefined;
  const headers = buildHeaders({ Accept: "text/csv, text/plain, */*", ...extra });
  delete headers["Content-Type"];

  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers,
    // Carry the POS device cookie on any /v1 call; harmless for bearer-auth
    // portal routes, and required cross-origin once the server allows credentials.
    credentials: "include",
  });

  if (res.status === 401 && !retried && tokens.refresh) {
    const refreshed = await refreshOnce();
    if (refreshed) return requestText(path, init, true);
    tokens.clear();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw parseApiError(body, res.status);
  }

  return res.text();
}
