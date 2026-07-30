/**
 * POS wire types.
 *
 * Every field ending `_minor` is an integer count of minor units — see
 * `@/lib/money`. There are no decimal strings on this surface, and mixing these
 * with the Phase 5 / billing decimal strings in one sum is the off-by-100 bug
 * this codebase is most likely to ship. Don't.
 */

import type { Minor } from "@/lib/money";
import type { BranchPosition, UserRole } from "@/lib/types/super-admin";
import type { ProductKind } from "@/lib/types/admin";
import type { StockUnit } from "@/lib/types/kitchen";

// ---- Session & bootstrap ----

export type DeviceProfile = "COUNTER" | "CURBSIDE";

/**
 * Terminal lifecycle. A device is **registered** by the manager (`PENDING`,
 * holding an outstanding activation code), **paired** by the physical till
 * (`ACTIVE`), or turned off (`REVOKED` — its current session dies on the next
 * call, not at token expiry).
 */
export type DeviceStatus = "PENDING" | "ACTIVE" | "REVOKED";

export interface PosLoginInput {
  email: string;
  password: string;
  /**
   * Usually omitted — the httpOnly `device_uid` cookie set at activation rides
   * along automatically. Sent in the body only as a fallback when the cookie
   * was lost but the localStorage copy survived (`device_uid_missing`).
   */
  device_uid?: string;
}

export interface PosLoginResult {
  access_token: string;
  device_id: number;
  branch_id: number;
}

export interface PosPinUnlockInput {
  email: string;
  pin: string;
  /** Same cookie-first rule as {@link PosLoginInput.device_uid}. */
  device_uid?: string;
}

export interface PosBootstrapBranch {
  id: number;
  code: string;
  country_code: string;
  province_code: string | null;
  currency: string;
  timezone: string;
}

export interface PosBootstrapDevice {
  id: number;
  code: string;
  profile: DeviceProfile;
}

// ---- Device registry ----

/**
 * Registering a terminal via `POST /v1/branch/devices`.
 *
 * The manager declares *"terminal T1 exists at my branch"* from their own
 * device — they never type the till's id. Registration returns a one-time
 * **activation code** the physical till later claims (see {@link PosActivateInput}).
 *
 * Branch Manager portal token only — Admin gets 403.
 */
export interface DeviceCreateInput {
  /** Short receipt label (`T1`) — unique per restaurant; treat as permanent. */
  code: string;
  /** `COUNTER` = cash drawer; `CURBSIDE` = no cash (`device_cannot_take_cash`). */
  profile: DeviceProfile;
  name?: string | null;
}

export interface PosDevice {
  id: number;
  code: string;
  profile: DeviceProfile;
  status: DeviceStatus;
  name?: string | null;
  /** A registration/reissue produced a code that hasn't been claimed yet. */
  has_outstanding_code?: boolean;
  /** Last time the paired till called home. Null until first contact. */
  last_seen_at?: string | null;
  branch_id?: number;
  created_at?: string;
}

/**
 * The response to create and reissue — a device plus its **one-time activation
 * code**. The code is returned only here and **never again**: `GET /devices`
 * omits it, so it must be surfaced (text + QR) the moment it arrives. Lost it?
 * Reissue.
 */
export interface PosDeviceActivation extends PosDevice {
  activation_code: string;
  activation_expires_at: string;
}

// ---- Device pairing (public) ----

/**
 * The physical till claiming its identity via `POST /v1/pos/session/activate`
 * — public, no auth token. On success the server sets the httpOnly
 * `device_uid` cookie; a cashier logs in afterward.
 */
export interface PosActivateInput {
  /** Grouped code from the manager (`AB3D-9KMN`) — server ignores dashes/case. */
  activation_code: string;
  /** uuid4 hex the till generated and **persisted before calling**. */
  device_uid: string;
}

export interface PosActivateResult {
  device_id: number;
  code: string;
  branch_id: number;
  profile: DeviceProfile;
}

export interface PosBootstrapUser {
  id: number;
  role: UserRole;
  position: BranchPosition | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
}

/**
 * The active country pack.
 *
 * `is_stub` is the one field here that changes what you are allowed to render:
 * when true the tax rules are a placeholder (`pk@stub-0pct`) and no
 * customer-facing receipt may claim a tax total. See `StubTaxBanner`.
 */
export interface PosPack {
  version: string;
  currency: string;
  minor_units: number;
  payment_methods: PaymentMethod[];
  is_stub: boolean;
  /**
   * Optional because the wiring guide contradicts itself: §0.3 says to compare
   * the operator's region pick against `pack.country_code`, but the §3 sample
   * response puts `country_code` on `branch` and not on `pack`.
   *
   * So it's read here if present and `branch.country_code` is the fallback —
   * see `packCountryCode`. Both readings work; neither needs a guess.
   */
  country_code?: string;
}

export interface PosBootstrap {
  branch: PosBootstrapBranch;
  device: PosBootstrapDevice;
  user: PosBootstrapUser;
  pack: PosPack;
  capabilities: Capability[];
  server_time: string;
}

// ---- Capabilities ----

/**
 * The server has already folded position AND device profile into this list, so
 * it is the only correct thing to gate POS UI on. Gating on `position` puts the
 * curbside-tablet rule ("no drawer, so no cash, whoever you are") back in the
 * client, where it will drift.
 *
 * The union is open at the edges on purpose: the guide says the list "will gain
 * entries later", and an unknown capability should be ignored, not crash.
 */
export type Capability =
  | "ORDER_CREATE"
  | "ORDER_READ"
  | "CUSTOMER_CREATE"
  | "CUSTOMER_READ"
  | "INVENTORY_READ"
  | "PAYMENT_TAKE"
  | "PAYMENT_CASH"
  | "SHIFT_OPEN"
  | "SHIFT_CLOSE"
  | "DRAWER_OPEN"
  | "WASTE_LOG"
  | "REFUND"
  | "DISCOUNT_OVER_LIMIT"
  | "VOID_AFTER_SEND"
  | (string & {});

// ---- Customers (as the till sees them) ----

/**
 * The till's view of a branch customer. Ids are numbers here, not strings: the
 * POS surface keys off `customer_id: number` on the order, whereas the branch
 * portal stringifies ids for its own consistency. Converting at the boundary
 * beats one shape pretending to be the other.
 */
export interface PosCustomer {
  id: number;
  name: string;
  phone: string | null;
  vehicle_plate?: string | null;
  vehicle_colour?: string | null;
}

// ---- Menu ----

export interface MenuModifierOption {
  id: number;
  name: string;
  price_delta_minor: Minor;
  product_id?: number | null;
}

export interface MenuModifierGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  options: MenuModifierOption[];
}

export interface MenuComboComponent {
  item_id: number;
  quantity: number;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string | null;
  price_minor: Minor;
  is_combo: boolean;
  is_available: boolean;
  /** Why it's off. Names the culprit component when a combo is unavailable. */
  unavailable_reason: string | null;
  components: MenuComboComponent[];
  modifier_groups: MenuModifierGroup[];
  product_id?: number | null;
  image_url?: string | null;
  /** Marketing copy shown on the public menu item detail view. */
  description?: string | null;
  /** Energy in kilocalories, shown as a detail chip on the public menu. */
  calories?: number | null;
  /** Typical preparation time in minutes, shown as a detail chip. */
  prep_time_minutes?: number | null;
}

export interface PosMenu {
  menu_version_id: number;
  currency: string;
  items: MenuItem[];
}

export interface AvailabilityRow {
  menu_item_id: number;
  is_available: boolean;
  reason: string | null;
  on_hand: number | null;
}

export interface SetAvailabilityInput {
  is_available: boolean;
  reason?: string;
  auto_clear_at?: string | null;
}

// ---- Print / routing / payment config (§7 — NEW·P1) ----
//
// `GET /v1/pos/config`, strong ETag `"cfg-{branch_id}-{version}"`. Cached so the
// device can route tickets, drive printers and show payment accounts entirely
// offline. Additive: nothing here exists on the wire until backend P1, and no
// hook fetches it yet — the shape is defined so the print controller and its
// cache can be built and mocked against it.

export type StationConnection = "LAN" | "USB" | "BT";
export type PrinterRole = "KITCHEN" | "RECEIPT";
export type PaymentAccountKind = "BANK" | "WALLET";

export interface PosStation {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  /** The fallback station: any order line that resolves to nothing lands here. */
  is_expo: boolean;
}

export interface PosPrinter {
  id: number;
  role: PrinterRole;
  station_id: number | null;
  connection: StationConnection;
  /** `192.168.1.50:9100` for LAN — the raw TCP target the shell prints to. */
  address: string;
  model: string;
  status?: string | null;
}

export interface PosReceiptPrinter {
  printer_id: number;
  connection: StationConnection;
  address: string;
}

/**
 * An admin-configured account the customer pays into for an ONLINE tender
 * (§10). Shown (or rendered as a QR from `qr_payload`/`account_ref`) so the
 * cashier can confirm receipt — there is no gateway, the confirmation is the
 * record.
 */
export interface PosPaymentAccount {
  id: number;
  label: string;
  kind: PaymentAccountKind;
  account_name: string;
  account_ref: string;
  bank_or_wallet: string;
  qr_payload?: string | null;
}

export interface PosConfig {
  config_version: number;
  stations: PosStation[];
  printers: PosPrinter[];
  category_map: Array<{ category: string; station_id: number }>;
  item_overrides: Array<{ menu_item_id: number; station_id: number }>;
  receipt_printer: PosReceiptPrinter | null;
  payment_accounts: PosPaymentAccount[];
}

// ---- Menu authoring (Admin) ----

export interface MenuVersionSummary {
  id: number;
  status: "DRAFT" | "PUBLISHED";
  published_at?: string | null;
  created_at?: string;
}

export interface CreateModifierGroupInput {
  name: string;
  min_select: number;
  max_select: number;
  options: Array<{
    name: string;
    /** Decimal string — authoring convenience; stored/returned as `_minor`. */
    price_delta: string;
    product_id?: number | null;
  }>;
}

export interface CreateMenuItemInput {
  name: string;
  /** Decimal string — authoring convenience; stored/returned as `price_minor`. */
  price: string;
  product_id?: number | null;
  category?: string | null;
  image_url?: string | null;
  description?: string | null;
  calories?: number | null;
  prep_time_minutes?: number | null;
  is_combo?: boolean;
  component_item_ids?: number[];
  modifier_group_ids?: number[];
}

// ---- Orders ----

export type OrderChannel = "COUNTER" | "CURBSIDE" | "DELIVERY" | "PICKUP";
export type OrderType = "DINE_IN" | "TAKEAWAY" | "CURBSIDE" | "DELIVERY" | "PICKUP";
export type OrderStatus = "DRAFT" | "PARKED" | "SENT";

export interface PosOrderLineInput {
  menu_item_id: number;
  quantity: number;
  modifier_option_ids?: number[];
  note?: string;
}

export interface PosOrderCreate {
  /** Minted client-side once per cart and persisted. Business dedupe forever. */
  local_id: string;
  lines: PosOrderLineInput[];
  channel: OrderChannel;
  order_type: OrderType;
  customer_id?: number | null;
  /** A *proposal*. Disagreement is a 409, never a silent acceptance. */
  expected_total_minor?: Minor;
  vehicle_plate?: string | null;
  vehicle_colour?: string | null;
  bay_no?: string | null;
}

export interface PosOrderLine {
  id: number;
  /** Non-null on combo children. Render only null-parent lines as priced rows. */
  parent_line_id: number | null;
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price_minor: Minor;
  line_total_minor: Minor;
  modifier_option_ids: number[];
  modifiers?: Array<{ id: number; name: string; price_delta_minor: Minor }>;
  note?: string | null;
}

export interface PosOrder {
  id: number;
  local_id: string;
  order_no: string;
  status: OrderStatus;
  channel: OrderChannel;
  order_type: OrderType;
  branch_id: number;
  customer_id: number | null;
  lines: PosOrderLine[];
  subtotal_minor: Minor;
  discount_minor: Minor;
  tax_minor: Minor;
  total_minor: Minor;
  paid_minor: Minor;
  due_minor: Minor;
  currency: string;
  menu_version_id: number;
  tax_profile_id?: number | null;
  pack_version?: string | null;
  flagged_for_review?: boolean;
  flag_reason?: string | null;
  vehicle_plate?: string | null;
  vehicle_colour?: string | null;
  bay_no?: string | null;
  created_at: string;
  sent_at?: string | null;
}

export interface KotLine {
  name: string;
  quantity: number;
  modifiers: string[];
  note?: string | null;
}

/** Deliberately carries no prices — the kitchen makes food, not money. */
export interface KotPayload {
  order_no: string;
  order_type?: OrderType | null;
  channel?: OrderChannel | null;
  lines: KotLine[];
  vehicle_plate?: string | null;
  vehicle_colour?: string | null;
  bay_no?: string | null;
  sent_at?: string | null;
}

// ---- Sync — the offline replay path (§9) ----
//
// `POST /v1/pos/sync/batch` — NO `Idempotency-Key`; dedup is by `local_id`.
// Max 50 envelopes per call (over 50 → 409 `batch_too_large`). Per-element
// results, never all-or-nothing: a bad element must not wedge the queue.

/** What already printed offline, so the kitchen doesn't re-emit on reconnect (P3). */
export interface SyncPrintResult {
  station_id?: number;
  kind: "KITCHEN" | "RECEIPT";
  state: string;
}

export interface SyncEnvelope {
  /** The create body — include `local_id`; do NOT set `expected_total_minor`. */
  order: PosOrderCreate;
  /** What the device charged offline. */
  device_total_minor: Minor;
  /** NEW·P3 — the kitchen ticket was fired offline (server settles stock + sales). */
  was_sent?: boolean;
  /** NEW·P3 — advisory only; the server stamps the authoritative time. */
  device_sent_at?: string;
  /** NEW·P3 — what already printed offline (double-print guard). */
  print_results?: SyncPrintResult[];
}

export interface SyncBatchInput {
  envelopes: SyncEnvelope[];
}

export type SyncResultStatus = "accepted" | "duplicate" | "flagged" | "failed";

/** Why the server flagged a sale — it accepted it anyway (accept + flag, never reject). */
export type FlaggedReason = "PRICE_DRIFT" | "STOCK_OVERSELL" | (string & {});

export interface SyncResult {
  local_id: string;
  status: SyncResultStatus;
  order_id?: number | null;
  server_total_minor?: Minor | null;
  settled?: boolean;
  stock_flagged?: boolean;
  flagged_reason?: FlaggedReason | null;
  print_jobs?: Array<{
    id: number;
    station_id?: number | null;
    kind: string;
    state: string;
  }>;
  error?: string | null;
}

export interface SyncBatchResult {
  accepted: number;
  duplicates: number;
  flagged: number;
  failed: number;
  results: SyncResult[];
}

/** One print outcome reported after the fact (§11 NEW·P4). */
export interface PrintResultInput {
  print_job_id: number;
  state: "PRINTED" | "FAILED";
  error?: string | null;
}

// ---- Money / payments ----

export type PaymentMethod = "CASH" | "CARD" | "WALLET" | (string & {});

export interface PriceQuoteInput {
  payment_method: PaymentMethod;
}

export interface PriceQuote {
  subtotal_minor: Minor;
  discount_minor: Minor;
  tax_minor: Minor;
  total_minor: Minor;
  currency: string;
  payment_method: PaymentMethod;
  pack_version?: string;
  lines?: Array<{ line_id: number; tax_minor: Minor }>;
}

export interface PaymentInput {
  method: PaymentMethod;
  amount_minor: Minor;
  /** Cash only, and required for it — omitting it is a 409 `tender_required`. */
  tendered_minor?: Minor;
  processor_ref?: string;
  auth_code?: string;
  /** Display-only. Never send a full PAN. */
  masked_pan?: string;
  /**
   * NEW·P5 — the forever-anchor for this tender. Minted once, persisted in the
   * outbox before the first attempt, and reused on every replay: the server
   * returns the *same* Payment for a repeated id, so an offline capture that
   * syncs twice never double-charges. Optional so online call sites that let
   * the server dedupe on `Idempotency-Key` alone keep working unchanged.
   */
  client_payment_id?: string;
  /**
   * NEW·P5 — which cached payment account the customer paid into for an ONLINE
   * tender (§10). Null/absent for CASH.
   */
  payment_account_id?: number | null;
}

export interface PaymentResult {
  id: number;
  order_id: number;
  method: PaymentMethod;
  amount_minor: Minor;
  /**
   * Nullable by server design: `null` for card / non-cash tenders, or before a
   * cash amount is entered. Handle the null at the boundary — never feed it
   * straight into `formatMinor`/`minorToDecimalString`, which throw on non-integers.
   */
  tendered_minor?: Minor | null;
  change_minor: Minor | null;
  status: "CAPTURED" | "VOIDED" | (string & {});
  created_at: string;
}

export type RefundReasonCode =
  | "CUSTOMER_CHANGED_MIND"
  | "KITCHEN_ERROR"
  | "WRONG_ENTRY"
  | "SPOILAGE"
  | "QUALITY_COMPLAINT"
  | "LATE_DELIVERY"
  | "PRICE_ADJUSTMENT"
  | "TRAINING"
  | "OTHER";

export const REFUND_REASON_CODES: RefundReasonCode[] = [
  "CUSTOMER_CHANGED_MIND",
  "KITCHEN_ERROR",
  "WRONG_ENTRY",
  "SPOILAGE",
  "QUALITY_COMPLAINT",
  "LATE_DELIVERY",
  "PRICE_ADJUSTMENT",
  "TRAINING",
  "OTHER",
];

export interface RefundInput {
  order_id: number;
  amount_minor: Minor;
  method: PaymentMethod;
  reason_code: RefundReasonCode;
  note?: string;
}

export interface RefundResult {
  id: number;
  order_id: number;
  amount_minor: Minor;
  method: PaymentMethod;
  reason_code: RefundReasonCode;
  created_at: string;
}

// ---- Discounts ----

export type DiscountType = "PCT" | "AMT" | (string & {});

export type DiscountScope = "ORDER" | "LINE";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DiscountRule {
  id: number;
  code: string;
  name: string;
  scope: DiscountScope;
  type: DiscountType;
  /** Basis points. 5000 = 50%. */
  value_bp: number;
  amount_minor: number;
  max_pct_bp?: number | null;
  is_active?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  active_days?: DayOfWeek[] | null;
  active_hours_start?: string | null;
  active_hours_end?: string | null;
}

export interface DiscountScheduleInput {
  valid_from?: string | null;
  valid_to?: string | null;
  active_days?: DayOfWeek[] | null;
  active_hours_start?: string | null;
  active_hours_end?: string | null;
}

export interface CreateDiscountRuleInput extends DiscountScheduleInput {
  code: string;
  name: string;
  scope?: DiscountScope;
  type: DiscountType;
  value_bp: number;
  amount_minor?: number;
  max_pct_bp?: number | null;
}

export interface UpdateDiscountRuleInput extends DiscountScheduleInput {
  code?: string;
  name?: string;
  scope?: DiscountScope;
  type?: DiscountType;
  value_bp?: number;
  amount_minor?: number;
  max_pct_bp?: number | null;
  is_active?: boolean;
}

export interface ApplyDiscountInput {
  code: string;
}

// ---- Shift & drawer ----

export type CashMovementType = "PAID_IN" | "PAID_OUT" | "DROP" | "PICKUP" | "NO_SALE";

export const CASH_MOVEMENT_TYPES: CashMovementType[] = [
  "PAID_IN",
  "PAID_OUT",
  "DROP",
  "PICKUP",
  "NO_SALE",
];

export interface OpenShiftInput {
  opening_float_minor: Minor;
}

export interface Shift {
  id: number;
  status: "OPEN" | "CLOSED";
  opening_float_minor: Minor;
  opened_at: string;
  closed_at?: string | null;
  opened_by_id?: number;
  device_id?: number;
}

export interface CashMovementInput {
  type: CashMovementType;
  amount_minor: Minor;
  reason_code?: string;
  note?: string;
}

export interface CashMovement {
  id: number;
  type: CashMovementType;
  amount_minor: Minor;
  reason_code?: string | null;
  created_at: string;
}

export interface CloseShiftInput {
  declared_cash_minor: Minor;
}

/**
 * X report (shift OPEN) vs Z report (shift CLOSED).
 *
 * `expected_cash_minor` and `variance_minor` are ABSENT while the shift is open
 * — that is the blind close, and it is a control, not an oversight. Do not
 * reconstruct them client-side from float + sales + movements; if the cashier
 * can see the target, the count is not a count.
 */
export interface ShiftReport {
  shift_id: number;
  status: "OPEN" | "CLOSED";
  opening_float_minor: Minor;
  gross_sales_minor: Minor;
  refunds_minor: Minor;
  discounts_minor: Minor;
  tax_minor: Minor;
  net_sales_minor: Minor;
  order_count: number;
  by_method: Array<{ method: PaymentMethod; amount_minor: Minor; count: number }>;
  cash_movements: CashMovement[];
  declared_cash_minor?: Minor | null;
  expected_cash_minor?: Minor | null;
  variance_minor?: Minor | null;
  opened_at: string;
  closed_at?: string | null;
}

// ---- Sellable products (menu picker) ----

/**
 * `GET /v1/pos/menu/sellable-products` — the ONLY correct source for the menu
 * item picker.
 *
 * The product-pricing list is not: it returns the whole catalogue, so the picker
 * used to offer the warehouse's flour. This endpoint returns `FINISHED_GOOD` +
 * `RESALE` only, so raw materials are gone by construction rather than by a
 * filter someone can forget.
 */
export interface SellableProduct {
  id: number;
  name: string;
  kind: ProductKind;
  category: string | null;
  /** Decimal string — the authoring surface's convention. */
  selling_price: string | null;
  is_available: boolean;
  /**
   * A `FINISHED_GOOD` with no recipe can go on a menu, but **the kitchen cannot
   * actually make it**. Worth a warning at authoring time rather than a
   * discovery mid-service.
   */
  has_recipe: boolean;
  sku?: string | null;
}

// ---- Phase 7 feed ----

export interface FeedWindow {
  start: string;
  end: string;
}

export interface SalesHistoryRow {
  date: string;
  product_id: number;
  product_name?: string;
  units: number;
  revenue_minor: Minor;
}

export interface WasteHistoryRow {
  date: string;
  product_id: number;
  product_name?: string;
  quantity: number;
  reason_code?: string | null;
}

export interface InventorySnapshotRow {
  product_id: number;
  product_name?: string;
  on_hand: number;
  stock_unit?: StockUnit;
  as_of: string;
}

/**
 * The planning contract is FINAL even though Phase 7 does not exist. It returns
 * `ready: false` rather than zeros specifically so this screen cannot ship a
 * forecast that silently lies. Render the empty state; change nothing when the
 * data starts arriving.
 */
export interface PlanningResponse {
  ready: boolean;
  reason?: string;
  forecast: Array<{
    date: string;
    product_id: number;
    product_name?: string;
    predicted_units: number;
  }>;
  suggested_orders: Array<{
    product_id: number;
    product_name?: string;
    suggested_qty: number;
  }>;
}
