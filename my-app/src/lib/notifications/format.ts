/**
 * Readable labels for the request-type enums the backend bakes into notification
 * bodies (e.g. "A new KITCHEN_TO_WAREHOUSE request (#15) was created.").
 *
 * These name the location TYPES involved, not the specific branch/warehouse/
 * kitchen. Resolving the instance name is a backend concern: the notification
 * payload carries no location id, and no single portal role can look every name
 * up (there is no `/warehouse/kitchens`, for one), so it cannot be done reliably
 * at render time.
 */
const REQUEST_TYPE_LABELS: Record<string, string> = {
  KITCHEN_TO_WAREHOUSE: "Kitchen → Warehouse",
  WAREHOUSE_TO_ADMIN_PO: "Warehouse → Admin",
  BRANCH_TO_ADMIN: "Branch → Admin",
  KITCHEN_TO_ADMIN: "Kitchen → Admin",
};

/**
 * Descriptive titles per request type, so the inbox names what the request IS
 * ("Kitchen product request") instead of a generic "New request".
 *
 * Keyed by the same enum tokens the backend bakes into the body, since that is
 * the only place the request type is exposed to the client.
 */
const REQUEST_TYPE_TITLES: Record<string, string> = {
  KITCHEN_TO_WAREHOUSE: "Kitchen stock request",
  WAREHOUSE_TO_ADMIN_PO: "Warehouse purchase request",
  KITCHEN_TO_ADMIN: "Kitchen distribution request",
  // "stock", not "product": a branch requests raw materials as well as finished
  // goods (kitchen-off tenants request raw materials straight from a warehouse).
  BRANCH_TO_ADMIN: "Branch stock request",
};

/**
 * The request-type token present in a body, or null. No token is a substring of
 * another, so a plain `includes` is unambiguous.
 */
function detectRequestType(body: string): string | null {
  for (const token of Object.keys(REQUEST_TYPE_TITLES)) {
    if (body.includes(token)) return token;
  }
  return null;
}

/**
 * A specific title for a request notification, derived from the request type in
 * its body; falls back to the backend's own title when no type is present (e.g.
 * status-change or low-stock notifications), so nothing else is disturbed.
 */
export function formatNotificationTitle(title: string, body: string): string {
  const type = detectRequestType(body);
  return type ? REQUEST_TYPE_TITLES[type] : title;
}

/**
 * Rewrite raw request-type enums in a notification body into readable phrases,
 * so the inbox reads in plain English instead of SCREAMING_SNAKE_CASE.
 *
 * Only known request-type tokens are swapped; every other character is left
 * untouched, so status-change bodies ("…moved from APPROVED to DISPATCHED") and
 * any future wording pass through unchanged. Safe to run on every body: with no
 * token present it returns the string as-is.
 */
export function formatNotificationBody(body: string): string {
  let out = body;
  for (const [token, label] of Object.entries(REQUEST_TYPE_LABELS)) {
    // Literal, global replace — no token is a substring of another, so order
    // does not matter and there is nothing to escape.
    out = out.split(token).join(label);
  }
  return out;
}
