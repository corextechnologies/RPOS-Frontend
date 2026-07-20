/**
 * POS session storage.
 *
 * Deliberately separate from `@/lib/api/tokens`, which holds the portal
 * session. These are two different lifecycles that happen to share an origin:
 *
 * - **The device identity** (`device_uid`) outlives every user. Minted once on
 *   first launch (UUID, or `DEV-TERMINAL-001` in development), persisted in
 *   localStorage, and reused forever — the same value the Branch Manager
 *   registers via `POST /v1/branch/devices` and this till sends at login.
 * - **The user session** (`access_token`) is short and swaps constantly — one
 *   till, many cashiers, PIN unlock between them.
 *
 * There is no refresh token on this surface. The POS login response carries an
 * access token only, so a 401 means "ask for the PIN again", not "silently
 * refresh". That is simpler than the portal's flow, not a gap in it.
 */

const DEVICE_UID_KEY = "rpos-device-uid";
const LEGACY_DEVICE_UID_KEY = "rpos-pos-device-uid";
const PAIRED_KEY = "rpos-pos-paired";
const TOKEN_KEY = "rpos-pos-access-token";
const CONTEXT_KEY = "rpos-pos-context";
const LAST_EMAIL_KEY = "rpos-pos-last-email";
const REGION_KEY = "rpos-pos-region";

/**
 * Dev-build shortcut: seed one COUNTER terminal per branch with this uid so
 * local login doesn't need a fresh registration every wipe. Must match what
 * the Branch Manager registers (or what the backend seed creates).
 */
// 16 chars — the server rejects device_uids shorter than 16.
export const DEV_TERMINAL_UID = "DEV-TERMINAL-001";

/**
 * The server rejects `device_uid` shorter than 16 chars (422
 * `string_too_short`). Anything below this — including uids minted by an older
 * build — is treated as absent so it gets re-minted rather than sent and bounced.
 */
export const MIN_DEVICE_UID_LENGTH = 16;

/** POS-specific routes outside the authenticated shell. */
export const POS_ROUTES = {
  /** Public device pairing screen — generate a uid, claim an activation code. */
  activate: "/activate",
} as const;

/**
 * The regions offered on the sign-in screen.
 *
 * This picks **language/region only**. It is not a tax decision and there is no
 * API that would let it be one: the rate comes from the branch record, resolved
 * server-side, and arrives in `bootstrap.pack`. That separation is deliberate —
 * a cashier who could select a zero-tax country could under-report the
 * restaurant's revenue.
 */
export const POS_REGIONS = [
  { code: "PK", label: "Pakistan" },
  { code: "AE", label: "United Arab Emirates" },
] as const;

export type PosRegionCode = (typeof POS_REGIONS)[number]["code"];

export interface PosSessionContext {
  device_id: number;
  branch_id: number;
}

function ls(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

/** A stored uid is usable only if it clears the server's length floor. */
function isUsableUid(uid: string): boolean {
  return uid.trim().length >= MIN_DEVICE_UID_LENGTH;
}

export const posSession = {
  /**
   * The terminal's identity. Persisted across sign-out on purpose — a till is
   * the same till tomorrow.
   */
  get deviceUid(): string | null {
    const store = ls();
    if (!store) return null;
    const current = store.getItem(DEVICE_UID_KEY);
    if (current) return isUsableUid(current) ? current : null;
    const legacy = store.getItem(LEGACY_DEVICE_UID_KEY);
    if (!legacy) return null;
    store.setItem(DEVICE_UID_KEY, legacy);
    store.removeItem(LEGACY_DEVICE_UID_KEY);
    return isUsableUid(legacy) ? legacy : null;
  },

  setDeviceUid(uid: string) {
    ls()?.setItem(DEVICE_UID_KEY, uid.trim());
  },

  /**
   * First launch: mint a durable `device_uid` and persist it **before** the
   * device calls activate. Later launches reuse the stored value. The uid is a
   * uuid4 hex (dashes stripped) to match the backend's expected shape;
   * development builds hardcode `DEV-TERMINAL-001` so pairing isn't part of every
   * local login loop.
   */
  ensureDeviceUid(): string {
    const existing = this.deviceUid;
    if (existing) return existing;
    const uid =
      process.env.NODE_ENV === "development"
        ? DEV_TERMINAL_UID
        : crypto.randomUUID().replace(/-/g, "");
    this.setDeviceUid(uid);
    return uid;
  },

  clearDeviceUid() {
    const store = ls();
    store?.removeItem(DEVICE_UID_KEY);
    store?.removeItem(LEGACY_DEVICE_UID_KEY);
  },

  /**
   * Whether this device has completed activation. The httpOnly cookie is the
   * real credential (JS can't read it), so this flag is only a client-side hint
   * for the launch state machine: paired → show login; not paired → show the
   * activation screen.
   */
  get paired(): boolean {
    return ls()?.getItem(PAIRED_KEY) === "1";
  },

  setPaired(value: boolean) {
    const store = ls();
    if (!store) return;
    if (value) store.setItem(PAIRED_KEY, "1");
    else store.removeItem(PAIRED_KEY);
  },

  /**
   * Drop the paired flag and end the user session, but keep the `device_uid` so
   * re-pairing (after the manager reissues a code) can reuse the same identity.
   * Called when a login/session call reports the terminal was revoked or rebound.
   */
  unpair() {
    const store = ls();
    if (!store) return;
    store.removeItem(PAIRED_KEY);
    store.removeItem(TOKEN_KEY);
    store.removeItem(CONTEXT_KEY);
  },

  get token(): string | null {
    return ls()?.getItem(TOKEN_KEY) ?? null;
  },

  get context(): PosSessionContext | null {
    const raw = ls()?.getItem(CONTEXT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PosSessionContext;
    } catch {
      return null;
    }
  },

  /**
   * Remembered so PIN unlock can skip the email field — the whole point of PIN
   * unlock is that it is fast at a queue. Not a credential.
   */
  get lastEmail(): string | null {
    return ls()?.getItem(LAST_EMAIL_KEY) ?? null;
  },

  /**
   * The operator's language/region pick. Local to this terminal and never sent
   * to the server — see `POS_REGIONS`. When it disagrees with the branch's
   * actual `pack.country_code`, the branch wins and the UI says so.
   */
  get region(): string | null {
    return ls()?.getItem(REGION_KEY) ?? null;
  },

  setRegion(code: string) {
    ls()?.setItem(REGION_KEY, code);
  },

  setSession(token: string, context: PosSessionContext, email?: string) {
    const store = ls();
    if (!store) return;
    store.setItem(TOKEN_KEY, token);
    store.setItem(CONTEXT_KEY, JSON.stringify(context));
    if (email) store.setItem(LAST_EMAIL_KEY, email);
  },

  /** Signs the *user* out. The device stays commissioned. */
  clearSession() {
    const store = ls();
    if (!store) return;
    store.removeItem(TOKEN_KEY);
    store.removeItem(CONTEXT_KEY);
  },

  /** Full decommission — device identity included. Settings-screen action. */
  reset() {
    const store = ls();
    if (!store) return;
    store.removeItem(TOKEN_KEY);
    store.removeItem(CONTEXT_KEY);
    store.removeItem(LAST_EMAIL_KEY);
    store.removeItem(DEVICE_UID_KEY);
    store.removeItem(LEGACY_DEVICE_UID_KEY);
    store.removeItem(PAIRED_KEY);
    store.removeItem(REGION_KEY);
  },
};
