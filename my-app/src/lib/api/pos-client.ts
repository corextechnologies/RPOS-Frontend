/**
 * The POS HTTP client.
 *
 * A sibling of `client.ts` rather than a widening of it, for three reasons that
 * are all structural:
 *
 * 1. **Different token.** POS tokens are device-bound; a `/v1/auth/login` token
 *    cannot reach `/v1/pos/*` at all (403 `device_not_bound`). `client.ts`
 *    unconditionally attaches `tokens.access`, which is the wrong credential
 *    here and would fail confusingly.
 * 2. **No refresh.** POS login returns an access token only. So a 401 means
 *    "ask for the PIN", not "silently refresh" — this client is genuinely
 *    simpler than the portal's, and folding them together would mean carrying
 *    `client.ts`'s refresh machinery into a flow that has no refresh token.
 * 3. **Idempotency.** Mutating POS calls require an `Idempotency-Key` header
 *    (missing → 422). Putting that here means no call site can forget it.
 *
 * Session expiry is surfaced by callback rather than by navigating: this module
 * is imported by non-React code (the offline outbox) and must not reach for a
 * router.
 */

import { apiConfig } from "./config";
import { parseApiError, unwrapData } from "./envelope";
import { posSession } from "@/lib/pos/session";
import { ApiError } from "@/lib/types/super-admin";

type ExpiryListener = () => void;
const expiryListeners = new Set<ExpiryListener>();

/** The POS shell subscribes to bounce the user to PIN unlock. */
export function onPosSessionExpired(fn: ExpiryListener): () => void {
  expiryListeners.add(fn);
  return () => expiryListeners.delete(fn);
}

function notifyExpired() {
  posSession.clearSession();
  for (const fn of expiryListeners) fn();
}

export interface PosRequestOptions extends RequestInit {
  /**
   * Required by the server on every mutating POS call. Mint per user intent
   * (`newIdempotencyKey()`), and reuse the same value across retries of it.
   */
  idempotencyKey?: string;
  /** Skips the auth header — only `session/login` and `session/pin-unlock`. */
  anonymous?: boolean;
  /** Returned to the caller alongside the body; used for menu ETag caching. */
  wantHeaders?: boolean;
}

function buildHeaders(opts?: PosRequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts?.headers as Record<string, string>) ?? {}),
  };

  if (apiConfig.isNgrok) headers["ngrok-skip-browser-warning"] = "true";

  if (!opts?.anonymous) {
    const token = posSession.token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  return headers;
}

async function send(path: string, opts?: PosRequestOptions): Promise<Response> {
  return fetch(`${apiConfig.baseUrl}${path}`, {
    ...opts,
    headers: buildHeaders(opts),
  });
}

/**
 * A failed fetch is a *network* failure, not an HTTP error, and on this surface
 * it usually means the branch's link is down rather than that anything is
 * wrong. It is given a distinguishable shape so the outbox can tell "queue this
 * and retry" apart from "the server rejected this, retrying won't help".
 */
export class PosOfflineError extends Error {
  constructor(cause?: unknown) {
    super("The terminal is offline");
    this.name = "PosOfflineError";
    this.cause = cause;
  }
}

export function isOfflineError(err: unknown): err is PosOfflineError {
  return err instanceof PosOfflineError;
}

async function handle<T>(res: Response, wantHeaders: boolean): Promise<T> {
  if (res.status === 401) {
    notifyExpired();
    throw new ApiError("Your session has expired. Enter your PIN.", 401, "session_expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw parseApiError(body, res.status);
  }

  if (res.status === 204 || res.status === 304) return undefined as T;

  const json = await res.json();
  const data = unwrapData<T>(json);
  if (wantHeaders) {
    return { data, headers: res.headers } as unknown as T;
  }
  return data;
}

export async function posRequest<T>(path: string, opts?: PosRequestOptions): Promise<T> {
  let res: Response;
  try {
    res = await send(path, opts);
  } catch (cause) {
    throw new PosOfflineError(cause);
  }
  return handle<T>(res, opts?.wantHeaders ?? false);
}

/**
 * Like `posRequest`, but keeps the envelope's `meta` for paginated lists —
 * mirrors `requestEnvelope` on the portal client.
 */
export async function posRequestEnvelope<T>(
  path: string,
  opts?: PosRequestOptions,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await send(path, opts);
  } catch (cause) {
    throw new PosOfflineError(cause);
  }

  if (res.status === 401) {
    notifyExpired();
    throw new ApiError("Your session has expired. Enter your PIN.", 401, "session_expired");
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

/**
 * A conditional GET that reports a 304 rather than throwing on it.
 *
 * Used only by the menu: a published menu version is immutable, so its ETag can
 * be trusted absolutely and a 304 is the common case on every reload.
 */
export async function posRequestWithEtag<T>(
  path: string,
  etag: string | null,
): Promise<{ status: 200; data: T; etag: string | null } | { status: 304 }> {
  let res: Response;
  try {
    res = await send(path, {
      headers: etag ? { "If-None-Match": etag } : undefined,
    });
  } catch (cause) {
    throw new PosOfflineError(cause);
  }

  if (res.status === 304) return { status: 304 };

  if (res.status === 401) {
    notifyExpired();
    throw new ApiError("Your session has expired. Enter your PIN.", 401, "session_expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw parseApiError(body, res.status);
  }

  const json = await res.json();
  return {
    status: 200,
    data: unwrapData<T>(json),
    etag: res.headers.get("ETag"),
  };
}
