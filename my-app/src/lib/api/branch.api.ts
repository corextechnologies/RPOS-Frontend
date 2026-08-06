/**
 * The `/v1/branch` surface (Phase 5).
 *
 * Money here is decimal strings, not minor units — these endpoints are
 * deliberately unchanged by the POS work. See `@/lib/types/branch`.
 */

import type { Kitchen, Paginated, RequestFilters, StockRequest, Warehouse } from "@/lib/types/admin";
import type {
  BranchCustomer,
  BranchDelivery,
  BranchRequestSummary,
  BranchStaff,
  CreateBranchStaffInput,
  CreateBranchStaffResult,
  UpdateBranchStaffInput,
  BranchCustomerFilters,
  BranchInventoryItem,
  BranchWasteInput,
  BranchOrder,
  BranchOrderFilters,
  BranchRefusalsQuery,
  BranchRefusalsReport,
  BranchSalesRollup,
  CreateBranchCustomerInput,
  CreateBranchOrderInput,
  CreateBranchRequestInput,
  UpdateBranchCustomerInput,
} from "@/lib/types/branch";
import type { DeviceCreateInput, PosDevice, PosDeviceActivation } from "@/lib/types/pos";
import type { RestaurantProductionMode } from "@/lib/types/super-admin";
import type { WasteEvent, WasteEventFilters } from "@/lib/types/waste";
import type { StockUnit } from "@/lib/stock-unit";
import { request, requestEnvelope } from "./client";
import { staffProfileBody } from "./staff-body";
import { idOrNull, numberFromMeta, optionalText } from "./normalize";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/** Flatten a branch inventory row (nested or flat) into the UI's flat shape. */
export function normalizeBranchInventory(i: RawBranchInventoryItem): BranchInventoryItem {
  return {
    id: String(i.id),
    product_id: String(i.product_id ?? i.product?.id ?? ""),
    product_name: i.product_name ?? i.product?.name ?? "",
    sku: i.sku ?? i.product?.sku ?? null,
    quantity: Number(i.quantity),
    batch_code: i.batch_code ?? "",
    expiry_date: i.expiry_date ?? null,
    // Server-decided; absent on legacy payloads → not expired.
    is_expired: Boolean(i.is_expired),
    // The serializer may put the unit top-level or nested under `product`.
    // Always present from the API (defaults to EACH); fall back defensively.
    stock_unit: i.stock_unit ?? i.product?.stock_unit ?? "EACH",
    location_id: String(i.location_id),
  };
}

/**
 * `/branch/inventory` as it arrives from the live API: ids may be numbers, and
 * the product name/sku come nested under `product` (the shared serializer),
 * rather than the flat `product_name`/`sku` the mock and UI use.
 */
export type RawBranchInventoryItem = {
  id: string | number;
  product_id?: string | number;
  product_name?: string;
  sku?: string | null;
  product?: {
    id?: string | number;
    name?: string;
    sku?: string | null;
    stock_unit?: StockUnit;
  };
  quantity: string | number;
  batch_code?: string | null;
  expiry_date?: string | null;
  is_expired?: boolean;
  stock_unit?: StockUnit;
  location_id: string | number;
};

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

function normalizeCustomer(c: BranchCustomer): BranchCustomer {
  return {
    ...c,
    id: String(c.id),
    branch_id: String(c.branch_id),
    phone: c.phone ?? null,
  };
}

function normalizeOrder(o: BranchOrder): BranchOrder {
  return {
    ...o,
    id: String(o.id),
    customer_id: idOrNull(o.customer_id),
    lines: (o.lines ?? []).map((l) => ({
      ...l,
      id: String(l.id),
      product_id: String(l.product_id),
      quantity: Number(l.quantity),
    })),
  };
}

function normalizeRequest(r: StockRequest): StockRequest {
  return {
    ...r,
    id: String(r.id),
    line_items: (r.line_items ?? []).map((l) => ({
      ...l,
      id: String(l.id),
      product_id: l.product_id == null ? undefined : String(l.product_id),
      quantity_requested: Number(l.quantity_requested),
    })),
  };
}

export const branchApi = {
  // ---- Terminals ----
  //
  // Branch Manager portal token only; Admin always gets 403. The manager
  // *registers* a terminal (declaring it exists), producing a one-time
  // activation code the physical till later *claims* — the manager never types
  // the device's id. Same ownership as staff provisioning: the manager who runs
  // the floor commissions tills, then creates the cashiers who sign in on them.

  listDevices(): Promise<PosDevice[]> {
    return request<PosDevice[]>("/branch/devices");
  },

  /**
   * Register a terminal. Returns the device **plus a one-time activation code**
   * (and its expiry) — surfaced once and never again by the list, so the caller
   * must show it (text + QR) immediately.
   */
  registerDevice(input: DeviceCreateInput): Promise<PosDeviceActivation> {
    return request<PosDeviceActivation>("/branch/devices", { method: "POST", ...json(input) });
  },

  /**
   * Mint a fresh activation code for an existing terminal — to recover a lost
   * code or to rebind a replacement device. The old device's next call then
   * fails `unknown_device` and self-routes to activation.
   */
  reissueDevice(id: number): Promise<PosDeviceActivation> {
    return request<PosDeviceActivation>(`/branch/devices/${id}/reissue`, { method: "POST" });
  },

  /** Turn a terminal off. Its current session dies on its next call, not at expiry. */
  revokeDevice(id: number): Promise<PosDevice> {
    return request<PosDevice>(`/branch/devices/${id}/revoke`, { method: "POST" });
  },

  // ---- Staff ----
  //
  // Live on the server, absent from the wiring guide. This is the endpoint that
  // makes the POS capability model usable at all: without it no BRANCH_STAFF
  // exists, and any that did would have `position = NULL` and therefore an
  // empty capability set — 403 on everything.

  async listBranchStaff(): Promise<BranchStaff[]> {
    const rows = await request<BranchStaff[]>("/branch/users");
    return rows.map((u) => ({
      ...u,
      id: String(u.id),
      full_name: u.full_name ?? null,
      position: u.position ?? null,
      branch_id: u.branch_id == null ? undefined : String(u.branch_id),
    }));
  },

  /** No `branch_id` in the body — it comes from the token, as everywhere else. */
  async createBranchStaff(body: CreateBranchStaffInput): Promise<CreateBranchStaffResult> {
    const res = await request<CreateBranchStaffResult>("/branch/users", {
      method: "POST",
      body: JSON.stringify({
        ...staffProfileBody(body),
        email: body.email.trim(),
        position: body.position,
      }),
    });
    return { ...res, user_id: String(res.user_id) };
  },

  async revokeBranchStaff(id: string): Promise<BranchStaff> {
    const data = await request<BranchStaff>(`/branch/users/${id}/revoke`, { method: "POST" });
    return { ...data, id: String(data.id), full_name: data.full_name ?? null, position: data.position ?? null };
  },

  async restoreBranchStaff(id: string): Promise<BranchStaff> {
    const data = await request<BranchStaff>(`/branch/users/${id}/restore`, { method: "POST" });
    return { ...data, id: String(data.id), full_name: data.full_name ?? null, position: data.position ?? null };
  },

  async deleteBranchStaff(id: string): Promise<void> {
    await request<{ detail: string }>(`/branch/users/${id}`, { method: "DELETE" });
  },

  async updateBranchStaff(id: string, body: UpdateBranchStaffInput): Promise<BranchStaff> {
    const data = await request<BranchStaff>(`/branch/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return { ...data, id: String(data.id), full_name: data.full_name ?? null, position: data.position ?? null };
  },

  // ---- Customers ----

  async listBranchCustomers(
    filters?: BranchCustomerFilters,
  ): Promise<Paginated<BranchCustomer>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? 50;
    const { data, meta } = await requestEnvelope<BranchCustomer[]>(
      `/branch/customers${qs({ search: optionalText(filters?.search), page, page_size: pageSize })}`,
    );
    return {
      items: data.map(normalizeCustomer),
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", pageSize),
      total: numberFromMeta(meta, "total", data.length),
    };
  },

  async getBranchCustomer(id: string): Promise<BranchCustomer> {
    return normalizeCustomer(await request<BranchCustomer>(`/branch/customers/${id}`));
  },

  /**
   * Note there is no `branch_id` in the body and there must never be one — the
   * server takes it from the token. A client-supplied branch is the same class
   * of hole as a country dropdown that picks your tax rate.
   */
  async createBranchCustomer(body: CreateBranchCustomerInput): Promise<BranchCustomer> {
    return normalizeCustomer(
      await request<BranchCustomer>("/branch/customers", {
        method: "POST",
        body: JSON.stringify({ name: body.name, phone: optionalText(body.phone) }),
      }),
    );
  },

  async updateBranchCustomer(
    id: string,
    body: UpdateBranchCustomerInput,
  ): Promise<BranchCustomer> {
    return normalizeCustomer(
      await request<BranchCustomer>(`/branch/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    );
  },

  /** Soft delete: past orders keep their customer; new orders can't attach it. */
  async deleteBranchCustomer(id: string): Promise<void> {
    await request<void>(`/branch/customers/${id}`, { method: "DELETE" });
  },

  // ---- Orders ----

  async listBranchOrders(filters?: BranchOrderFilters): Promise<Paginated<BranchOrder>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? 50;
    const { data, meta } = await requestEnvelope<BranchOrder[]>(
      `/branch/orders${qs({ page, page_size: pageSize })}`,
    );
    return {
      items: data.map(normalizeOrder),
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", pageSize),
      total: numberFromMeta(meta, "total", data.length),
    };
  },

  /**
   * `unit_price` is omitted unless the caller explicitly proposes one — the
   * server prices. Sending a stale price earns a 409 `price_mismatch` with a
   * per-line breakdown, which `PriceMismatchDialog` renders.
   */
  async createBranchOrder(body: CreateBranchOrderInput): Promise<BranchOrder> {
    return normalizeOrder(
      await request<BranchOrder>("/branch/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_id: body.customer_id || undefined,
          note: optionalText(body.note),
          lines: body.lines.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            ...(l.unit_price ? { unit_price: l.unit_price } : {}),
          })),
        }),
      }),
    );
  },

  // ---- Stock requests (BRANCH_TO_ADMIN) ----

  async listBranchKitchens(): Promise<Kitchen[]> {
    const rows = await request<Kitchen[]>("/branch/kitchens");
    return (rows ?? []).map((k) => ({
      ...k,
      id: String(k.id),
      restaurant_id: String(k.restaurant_id),
      location: k.location ?? null,
    }));
  },

  /** Warehouses this branch may name to fulfil a request (kitchen-off tenant). */
  async listBranchWarehouses(): Promise<Warehouse[]> {
    const rows = await request<Warehouse[]>("/branch/warehouses");
    return (rows ?? []).map((w) => ({
      ...w,
      id: String(w.id),
      restaurant_id: String(w.restaurant_id),
      location: w.location ?? null,
    }));
  },

  async listBranchRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? 20;
    const { data, meta } = await requestEnvelope<StockRequest[]>(
      `/branch/requests${qs({
        status: filters?.status && filters.status !== "all" ? filters.status : undefined,
        page,
        page_size: pageSize,
      })}`,
    );
    return {
      items: data.map(normalizeRequest),
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", pageSize),
      total: numberFromMeta(meta, "total", data.length),
    };
  },

  async getBranchRequestsSummary(): Promise<BranchRequestSummary> {
    const data = await request<BranchRequestSummary>("/branch/requests/summary");
    return {
      open: Number(data.open ?? 0),
      received: Number(data.received ?? 0),
      rejected: Number(data.rejected ?? 0),
      total: Number(data.total ?? 0),
    };
  },

  /** No `branch_id` in the body — the server takes it from the token. */
  async createBranchRequest(body: CreateBranchRequestInput): Promise<StockRequest> {
    return normalizeRequest(
      await request<StockRequest>("/branch/requests", {
        method: "POST",
        body: JSON.stringify({
          // Send exactly the one the branch named; null (not "") for the other —
          // the backend schema is `int | None`, and "" fails int coercion.
          // Kitchen tenant sends kitchen_id; kitchen-less sends warehouse_id.
          kitchen_id: body.kitchen_id || null,
          warehouse_id: body.warehouse_id || null,
          notes: optionalText(body.notes),
          lines: body.lines.map((l) => ({
            product_id: l.product_id,
            quantity_requested: l.quantity_requested,
          })),
        }),
      }),
    );
  },

  async receiveBranchRequest(requestId: string): Promise<StockRequest> {
    return normalizeRequest(
      await request<StockRequest>(`/branch/requests/${requestId}/receive`, {
        method: "POST",
      }),
    );
  },

  // ---- Incoming deliveries (from the kitchen) ----

  async listBranchDeliveries(): Promise<BranchDelivery[]> {
    // The list isn't paged in the UI; ask for a generous page so the envelope's
    // first page holds everything. `request` unwraps `{ data }` to the array.
    const items = await request<BranchDelivery[]>("/branch/deliveries?page=1&page_size=100");
    return (items ?? []).map((d) => ({
      ...d,
      id: String(d.id),
      request_id: String(d.request_id),
      product_id: String(d.product_id),
      quantity: Number(d.quantity),
    }));
  },

  async receiveBranchDelivery(deliveryId: string): Promise<BranchDelivery> {
    const d = await request<BranchDelivery>(`/branch/deliveries/${deliveryId}/receive`, {
      method: "POST",
    });
    return { ...d, id: String(d.id), request_id: String(d.request_id), quantity: Number(d.quantity) };
  },

  // ---- Inventory ----

  async listBranchInventory(): Promise<BranchInventoryItem[]> {
    const items = await request<RawBranchInventoryItem[]>("/branch/inventory");
    // The live API nests product name/sku under `product` — the same serializer
    // the warehouse and kitchen portals consume — so lift them into the flat
    // fields the UI reads. Tolerates a flat payload too (as the mock returns).
    return items.map(normalizeBranchInventory);
  },

  async wasteBranchStock(body: BranchWasteInput): Promise<BranchInventoryItem[]> {
    // Branch waste is product-level and spends across lots earliest-expiry-first,
    // so it can touch more than one lot — the API returns every affected row.
    // `batch_code` is intentionally omitted: branch stock is product-level and the
    // server ignores it.
    const data = await request<RawBranchInventoryItem[]>("/branch/stock/waste", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id,
        quantity: body.quantity,
        waste_reason: body.waste_reason,
        movement_type: body.movement_type,
        notes: optionalText(body.notes),
      }),
    });
    return (data ?? []).map(normalizeBranchInventory);
  },

  async listBranchWasteEvents(
    filters?: WasteEventFilters,
  ): Promise<WasteEvent[]> {
    const suffix = filters?.movement_type
      ? `?movement_type=${filters.movement_type}`
      : "";
    const data = await request<WasteEvent[]>(`/branch/waste${suffix}`);
    return (data ?? []).map((event) => ({
      ...event,
      id: String(event.id),
      product_id: String(event.product_id),
      product: { ...event.product, id: String(event.product.id) },
      quantity: Number(event.quantity),
      batch_code: event.batch_code ?? "",
      location_id: String(event.location_id),
    }));
  },

  /** Response shape already matches the UI type 1:1 — no adapter needed. */
  getBranchRestaurantProductionMode(): Promise<RestaurantProductionMode> {
    return request<RestaurantProductionMode>("/branch/restaurant");
  },

  // ---- Sales rollup & refusals (forecasting) ----
  //
  // Live HTTP only, like the device calls: these are net-new forecast endpoints
  // with no mock path. `branch_id` is never in the body/query — the server takes
  // it from the token, as everywhere on this surface.

  /**
   * The "Day closed" recount — total this branch's sales for the forecast now,
   * rather than waiting for the 5:30am job. No body. Idempotent and side-effect
   * free beyond recalculation: safe to call any number of times, at any hour.
   */
  rolloverSales(): Promise<BranchSalesRollup> {
    return request<BranchSalesRollup>("/branch/sales/rollup", { method: "POST" });
  },

  /** Turn-aways over the last `days`, grouped by product + reason. */
  refusals(query?: BranchRefusalsQuery): Promise<BranchRefusalsReport> {
    return request<BranchRefusalsReport>(
      `/branch/sales/refusals${qs({
        days: query?.days,
        demand_only: query?.demand_only === undefined ? undefined : String(query.demand_only),
      })}`,
    );
  },
};
