import { ApiError } from "@/lib/types/super-admin";
import { apiConfig } from "./config";
import { parseApiError, unwrapData } from "./envelope";
import { tokens } from "./tokens";

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refresh = tokens.refresh;
  if (!refresh) return false;

  try {
    const res = await fetch(`${apiConfig.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const access = tokens.access;
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers,
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
