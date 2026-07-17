/**
 * POS session storage.
 *
 * Deliberately separate from `@/lib/api/tokens`, which holds the portal
 * session. These are two different lifecycles that happen to share an origin:
 *
 * - **The device identity** (`device_uid`) outlives every user. It is set once
 *   when the terminal is commissioned and survives sign-out, because signing
 *   out of a till does not move it to another branch.
 * - **The user session** (`access_token`) is short and swaps constantly — one
 *   till, many cashiers, PIN unlock between them.
 *
 * There is no refresh token on this surface. The POS login response carries an
 * access token only, so a 401 means "ask for the PIN again", not "silently
 * refresh". That is simpler than the portal's flow, not a gap in it.
 */

const DEVICE_UID_KEY = "rpos-pos-device-uid";
const TOKEN_KEY = "rpos-pos-access-token";
const CONTEXT_KEY = "rpos-pos-context";
const LAST_EMAIL_KEY = "rpos-pos-last-email";
const REGION_KEY = "rpos-pos-region";

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

export const posSession = {
  /**
   * The terminal's identity. Persisted across sign-out on purpose — a till is
   * the same till tomorrow.
   */
  get deviceUid(): string | null {
    return ls()?.getItem(DEVICE_UID_KEY) ?? null;
  },

  setDeviceUid(uid: string) {
    ls()?.setItem(DEVICE_UID_KEY, uid.trim());
  },

  clearDeviceUid() {
    ls()?.removeItem(DEVICE_UID_KEY);
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
    store.removeItem(REGION_KEY);
  },
};
