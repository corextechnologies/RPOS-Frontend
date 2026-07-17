/**
 * The **back-office** corner of `/v1/pos` — menu authoring, discount rules,
 * recipes, the Phase 7 feed and planning. Everything under `/pos` that is not
 * done at a till.
 *
 * **These use the PORTAL token, not the POS one, and that is a deduction rather
 * than something the wiring guide states.** The guide says a
 * `/v1/auth/login` token "cannot reach POS endpoints at all
 * (403 `device_not_bound`)", and separately that authoring is "Admin only". Both
 * cannot be true of these endpoints: an Admin signs in through the ordinary
 * portal, has no `device_uid`, and therefore *cannot obtain a device-bound
 * token by any route the guide describes*. So either these accept the portal
 * token, or authoring is impossible. This module assumes the former.
 *
 * The same argument covers planning and the feed: a branch manager reading a
 * forecast is at a desk, not standing at a till, and `/branch/planning` is a
 * portal screen. (An earlier version of that screen called these through the
 * POS client and would have 403'd for exactly this reason.)
 *
 * If the assumption is wrong the calls 403 with `device_not_bound` and the fix
 * is one line each — swap `request` for `posRequest`. Which is precisely why
 * they live here rather than being scattered through `pos.api.ts`: the
 * assumption has one address.
 *
 * Flagged to the backend team; see `docs/pos-frontend-implementation.md`.
 */

import type {
  CreateDiscountRuleInput,
  DeviceRegisterInput,
  PosDevice,
  CreateMenuItemInput,
  CreateModifierGroupInput,
  DiscountRule,
  FeedWindow,
  InventorySnapshotRow,
  MenuVersionSummary,
  PlanningResponse,
  PosMenu,
  PosOrder,
  SellableProduct,
  SetAvailabilityInput,
  AvailabilityRow,
  SalesHistoryRow,
  WasteHistoryRow,
} from "@/lib/types/pos";
import { request } from "./client";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/** The server's cap. Wider windows earn 409 `window_too_large`. */
export const FEED_MAX_DAYS = 400;

export const posAdminApi = {
  // ---- Device registry ----
  //
  // Absent from the wiring guide entirely, which is why a new terminal answered
  // `unknown_device` at sign-in with nothing in the UI to fix it.
  //
  // Note this one is NOT an assumption: registering a device *must* accept a
  // portal token, because a device-bound token cannot exist before the device
  // does. It's the chicken-and-egg that proves the rest of this module's
  // reasoning.

  listDevices(): Promise<PosDevice[]> {
    return request<PosDevice[]>("/pos/devices");
  },

  /**
   * The `device_uid` is what the terminal types at sign-in; `code` is what
   * prints on the receipt (`{branch_code}-{terminal_code}-{seq}`). They are
   * different fields on purpose and both are required.
   */
  registerDevice(input: DeviceRegisterInput): Promise<PosDevice> {
    return request<PosDevice>("/pos/devices", { method: "POST", ...json(input) });
  },

  // ---- Manager-side POS reads/writes ----
  //
  // These are `/pos/*` but take an ORDINARY role-gated token, not a device one
  // — the backend's route list is explicit about it. They were on the device
  // client until that list arrived, which would have 403'd for a manager
  // reviewing flagged orders from a desk.

  /** Read the live availability list from a desk, not a till. */
  availability(): Promise<AvailabilityRow[]> {
    return request<AvailabilityRow[]>("/pos/availability");
  },

  /** The manager review queue for orders the server flagged on sync. */
  flaggedOrders(): Promise<PosOrder[]> {
    return request<PosOrder[]>("/pos/orders/flagged");
  },

  /** 86-ing. Manager-only, and off the till: this needs a portal token. */
  setAvailability(menuItemId: number, input: SetAvailabilityInput): Promise<AvailabilityRow> {
    return request<AvailabilityRow>(`/pos/availability/${menuItemId}`, {
      method: "PUT",
      ...json(input),
    });
  },

  // ---- Menu authoring ----

  /** A new DRAFT version. Nothing is live until `publish`. */
  createMenuVersion(): Promise<MenuVersionSummary> {
    return request<MenuVersionSummary>("/pos/menu/versions", { method: "POST", ...json({}) });
  },

  /**
   * `price_delta` is a decimal string here — an authoring convenience the guide
   * calls out explicitly. It comes back as `price_delta_minor`.
   */
  createModifierGroup(versionId: number, input: CreateModifierGroupInput) {
    return request<{ id: number }>(`/pos/menu/versions/${versionId}/modifier-groups`, {
      method: "POST",
      ...json(input),
    });
  },

  /** `price` is a decimal string; stored and returned as `price_minor`. */
  createMenuItem(versionId: number, input: CreateMenuItemInput) {
    return request<{ id: number }>(`/pos/menu/versions/${versionId}/items`, {
      method: "POST",
      ...json(input),
    });
  },

  /**
   * After this the version is **immutable** — edits earn 409
   * `menu_version_immutable`. Changing a price means publishing a new version,
   * which is the point: a receipt from last month must still reprint at last
   * month's prices.
   */
  publishMenuVersion(versionId: number): Promise<MenuVersionSummary> {
    return request<MenuVersionSummary>(`/pos/menu/versions/${versionId}/publish`, {
      method: "POST",
    });
  },

  /**
   * **The only correct source for the menu item picker.**
   *
   * `FINISHED_GOOD` + `RESALE` only. The product-pricing list is not a
   * substitute: it returns the whole catalogue, which is why the picker used to
   * offer the warehouse's flour. Raw materials are excluded here by
   * construction rather than by a filter someone can forget — and the server
   * 409s `product_not_sellable` if one is added anyway.
   */
  sellableProducts(): Promise<SellableProduct[]> {
    return request<SellableProduct[]>("/pos/menu/sellable-products");
  },

  /** The published menu, as the tills see it. Read-only preview for Admin. */
  publishedMenu(version?: number): Promise<PosMenu> {
    return request<PosMenu>(`/pos/menu${version ? `?version=${version}` : ""}`);
  },

  // ---- Discount rules ----

  listDiscountRules(): Promise<DiscountRule[]> {
    return request<DiscountRule[]>("/pos/discount-rules");
  },

  createDiscountRule(input: CreateDiscountRuleInput): Promise<DiscountRule> {
    return request<DiscountRule>("/pos/discount-rules", { method: "POST", ...json(input) });
  },

  // ---- Phase 7 feed ----
  //
  // "Raw facts only", branch-scoped. Built for Phase 7 to consume; surfaced to
  // humans here because a branch asking "what did we sell" shouldn't need a
  // forecasting engine to exist first.

  salesHistory(w: FeedWindow): Promise<SalesHistoryRow[]> {
    return request<SalesHistoryRow[]>(`/pos/feed/sales-history${qs({ ...w })}`);
  },

  wasteHistory(w: FeedWindow): Promise<WasteHistoryRow[]> {
    return request<WasteHistoryRow[]>(`/pos/feed/waste-history${qs({ ...w })}`);
  },

  inventorySnapshot(): Promise<InventorySnapshotRow[]> {
    return request<InventorySnapshotRow[]>("/pos/feed/inventory-snapshot");
  },

  /**
   * Returns `ready: false` until Phase 7 lands — deliberately, so a forecast
   * screen can't ship a lie. The shape is final; wire against it now.
   */
  planning(): Promise<PlanningResponse> {
    return request<PlanningResponse>("/pos/planning");
  },
};
