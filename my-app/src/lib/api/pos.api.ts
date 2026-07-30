/**
 * The `/v1/pos` surface.
 *
 * Note this module is NOT part of the `ApiClient` contract and has no mock
 * implementation. That is deliberate: the POS depends on device binding,
 * server-authoritative tax packs, idempotent replay and per-element sync
 * semantics — all of which are the parts a mock would get wrong, and the
 * backend is already built. Mocking it would be thousands of lines of fiction
 * that agrees with itself and not with the server.
 *
 * Consequence: the POS requires `NEXT_PUBLIC_API_BASE_URL` and a live backend.
 * It ignores `NEXT_PUBLIC_USE_MOCK` entirely.
 */

import type { Paginated } from "@/lib/types/admin";
import type {
  ApplyDiscountInput,
  CreateDiscountRuleInput,
  DiscountRule,
  AvailabilityRow,
  CashMovement,
  CashMovementInput,
  CloseShiftInput,
  KotPayload,
  OpenShiftInput,
  PaymentInput,
  PaymentResult,
  PrintResultInput,
  SyncBatchInput,
  SyncBatchResult,
  PosActivateInput,
  PosActivateResult,
  PosBootstrap,
  PosCustomer,
  PosLoginInput,
  PosLoginResult,
  PosMenu,
  PosOrder,
  PosOrderCreate,
  PosPinUnlockInput,
  PriceQuote,
  PriceQuoteInput,
  RefundInput,
  RefundResult,
  Shift,
  ShiftReport,
} from "@/lib/types/pos";
import { posRequest, posRequestEnvelope, posRequestWithEtag } from "./pos-client";
import { numberFromMeta } from "./normalize";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/**
 * Drop `device_uid` from a login/pin-unlock body when it's absent, so the
 * cookie path sends `{ email, password }` clean rather than `device_uid: null`
 * — the server resolves the uid from cookie/header when the body omits it.
 */
function loginBody<T extends { device_uid?: string }>(input: T): Omit<T, "device_uid"> & {
  device_uid?: string;
} {
  if (input.device_uid) return input;
  const { device_uid: _omit, ...rest } = input;
  void _omit;
  return rest;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const posApi = {
  // ---- Session ----

  /**
   * Pair this device to a terminal by claiming a one-time activation code.
   * Anonymous — there is no user token yet. On success the server sets the
   * httpOnly `device_uid` cookie (hence `credentials: "include"` in the client),
   * and a cashier logs in afterward.
   */
  activate(input: PosActivateInput): Promise<PosActivateResult> {
    return posRequest<PosActivateResult>("/pos/session/activate", {
      method: "POST",
      anonymous: true,
      ...json(input),
    });
  },

  /**
   * Anonymous: there is no session yet, and the token this returns is the one.
   * `device_uid` is normally omitted — it rides the httpOnly cookie. It is sent
   * in the body only as a fallback (cookie lost, localStorage survived).
   */
  login(input: PosLoginInput): Promise<PosLoginResult> {
    return posRequest<PosLoginResult>("/pos/session/login", {
      method: "POST",
      anonymous: true,
      ...json(loginBody(input)),
    });
  },

  pinUnlock(input: PosPinUnlockInput): Promise<PosLoginResult> {
    return posRequest<PosLoginResult>("/pos/session/pin-unlock", {
      method: "POST",
      anonymous: true,
      ...json(loginBody(input)),
    });
  },

  /** Sets the *caller's own* PIN — authenticated, not an admin action. */
  setPin(pin: string): Promise<void> {
    return posRequest<void>("/pos/session/pin", { method: "POST", ...json({ pin }) });
  },

  bootstrap(): Promise<PosBootstrap> {
    return posRequest<PosBootstrap>("/pos/session/bootstrap");
  },

  // ---- Customers ----
  //
  // ASSUMPTION, flagged: the bootstrap capability table lists
  // CUSTOMER_CREATE/CUSTOMER_READ against "customer capture/lookup", and
  // `POST /pos/orders` takes a `customer_id` — so the till must be able to
  // find and create customers. But the only customer endpoints the guide
  // documents are `/v1/branch/customers`, which is a portal-token surface,
  // and a till holds a device-bound token and nothing else.
  //
  // These therefore call the branch endpoints with the POS token. The guide
  // says a portal token can't reach `/pos/*`; it says nothing about the
  // reverse, and a POS token does carry a user and a branch. If this 403s,
  // the backend needs to expose `/pos/customers` — see the docs.

  searchCustomers(search: string): Promise<PosCustomer[]> {
    return posRequest<PosCustomer[]>(`/branch/customers${qs({ search, page_size: 20 })}`);
  },

  createCustomer(input: { name: string; phone?: string }): Promise<PosCustomer> {
    // No branch_id: it comes from the token. Same rule as the branch portal.
    return posRequest<PosCustomer>("/branch/customers", { method: "POST", ...json(input) });
  },

  // ---- Menu ----

  /**
   * Conditional on the ETag. A published version never changes, so a 304 here
   * is authoritative and the cached copy can be trusted without revalidation.
   * Availability is explicitly NOT covered by this — poll `availability()`.
   */
  menu(etag: string | null, version?: number) {
    return posRequestWithEtag<PosMenu>(`/pos/menu${qs({ version })}`, etag);
  },

  // ---- Availability (86-ing) ----

  availability(): Promise<AvailabilityRow[]> {
    return posRequest<AvailabilityRow[]>("/pos/availability");
  },

  // NOTE: `PUT /pos/availability/{id}` (86-ing) is NOT here. The backend's
  // route list puts it on an ordinary role-gated token, not a device one — see
  // `pos-admin.api.ts`. A till holds only a device token, so 86-ing is a
  // back-office action rather than something done at the counter.

  // ---- Orders ----

  createOrder(input: PosOrderCreate, idempotencyKey: string): Promise<PosOrder> {
    return posRequest<PosOrder>("/pos/orders", {
      method: "POST",
      idempotencyKey,
      ...json(input),
    });
  },

  getOrder(id: number): Promise<PosOrder> {
    return posRequest<PosOrder>(`/pos/orders/${id}`);
  },

  setOrderStatus(id: number, status: "PARKED" | "DRAFT"): Promise<PosOrder> {
    return posRequest<PosOrder>(`/pos/orders/${id}`, { method: "PATCH", ...json({ status }) });
  },

  /**
   * Fires the KOT and deducts stock. Idempotent server-side — re-sending after
   * a timeout never double-deducts, so a retry is safe.
   */
  sendOrder(id: number): Promise<PosOrder> {
    return posRequest<PosOrder>(`/pos/orders/${id}/send`, { method: "POST" });
  },

  kot(id: number): Promise<KotPayload> {
    return posRequest<KotPayload>(`/pos/orders/${id}/kot`);
  },

  async listOrders(page = 1, pageSize = 50): Promise<Paginated<PosOrder>> {
    const { data, meta } = await posRequestEnvelope<PosOrder[]>(
      `/pos/orders${qs({ page, page_size: pageSize })}`,
    );
    return {
      items: data,
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", pageSize),
      total: numberFromMeta(meta, "total", data.length),
    };
  },

  // `GET /pos/orders/flagged` is likewise portal-token — see `pos-admin.api.ts`.

  // ---- Sync (offline replay, §9) ----

  /**
   * Replay queued orders. **No `Idempotency-Key`** — dedup is by each envelope's
   * `local_id`, so a replay days later is safe and a re-replay is a no-op. Cap
   * the caller at 50 envelopes; over that the server returns `409 batch_too_large`.
   * Per-element results: one bad envelope never fails the batch.
   */
  syncBatch(input: SyncBatchInput): Promise<SyncBatchResult> {
    return posRequest<SyncBatchResult>("/pos/sync/batch", { method: "POST", ...json(input) });
  },

  /**
   * Report print outcomes for jobs that already have server ids (§11 NEW·P4).
   * `PRINTED` is terminal — re-reporting is a no-op. Offline prints report via
   * the sync envelope's `print_results` instead.
   */
  printResults(results: PrintResultInput[]): Promise<unknown> {
    return posRequest<unknown>("/pos/print/results", { method: "POST", ...json(results) });
  },

  // ---- Money ----

  /**
   * No side effects. Call it when the tender is chosen and BEFORE taking money
   * — under the PK pack the tax can depend on how the customer pays, so the
   * total shown at cart time is not necessarily the total owed.
   */
  priceQuote(orderId: number, input: PriceQuoteInput): Promise<PriceQuote> {
    return posRequest<PriceQuote>(`/pos/price-quote/${orderId}`, {
      method: "POST",
      ...json(input),
    });
  },

  pay(orderId: number, input: PaymentInput, idempotencyKey: string): Promise<PaymentResult> {
    return posRequest<PaymentResult>(`/pos/orders/${orderId}/payments`, {
      method: "POST",
      idempotencyKey,
      ...json(input),
    });
  },

  refund(input: RefundInput, idempotencyKey: string): Promise<RefundResult> {
    return posRequest<RefundResult>("/pos/refunds", {
      method: "POST",
      idempotencyKey,
      ...json(input),
    });
  },

  applyDiscount(orderId: number, input: ApplyDiscountInput): Promise<PosOrder> {
    return posRequest<PosOrder>(`/pos/orders/${orderId}/discounts`, {
      method: "POST",
      ...json(input),
    });
  },

  listDiscountRules(): Promise<DiscountRule[]> {
    return posRequest<DiscountRule[]>("/pos/discount-rules");
  },

  createDiscountRule(input: CreateDiscountRuleInput): Promise<DiscountRule> {
    return posRequest<DiscountRule>("/pos/discount-rules", { method: "POST", ...json(input) });
  },

  // ---- Shift & drawer ----

  openShift(input: OpenShiftInput): Promise<Shift> {
    return posRequest<Shift>("/pos/shifts", { method: "POST", ...json(input) });
  },

  currentShift(): Promise<Shift | null> {
    return posRequest<Shift | null>("/pos/shifts/current");
  },

  cashMovement(input: CashMovementInput): Promise<CashMovement> {
    return posRequest<CashMovement>("/pos/cash-movements", { method: "POST", ...json(input) });
  },

  /**
   * X report while the shift is open, Z once closed. The open form omits
   * `expected_cash_minor` on purpose — see `ShiftReport`. Do not reconstruct it.
   */
  shiftReport(shiftId: number): Promise<ShiftReport> {
    return posRequest<ShiftReport>(`/pos/reports/shift/${shiftId}`);
  },

  closeShift(shiftId: number, input: CloseShiftInput): Promise<ShiftReport> {
    return posRequest<ShiftReport>(`/pos/shifts/${shiftId}/close`, {
      method: "PATCH",
      ...json(input),
    });
  },

  // ---- Back-office ----
  //
  // Menu authoring, discount-rule creation, recipes, the Phase 7 feed and
  // planning deliberately DO NOT live here. They are done at a desk with a
  // portal token, not at a till with a device-bound one — see
  // `pos-admin.api.ts` for the reasoning. Keeping them out of this module is
  // what stops a back-office call quietly acquiring a device dependency.
};
