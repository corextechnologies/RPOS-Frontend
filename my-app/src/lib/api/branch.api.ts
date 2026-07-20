/**
 * The `/v1/branch` surface (Phase 5).
 *
 * Money here is decimal strings, not minor units — these endpoints are
 * deliberately unchanged by the POS work. See `@/lib/types/branch`.
 */

import type { Kitchen, Paginated, RequestFilters, StockRequest } from "@/lib/types/admin";
import type {
  BranchCustomer,
  BranchDelivery,
  BranchStaff,
  CreateBranchStaffInput,
  CreateBranchStaffResult,
  BranchCustomerFilters,
  BranchInventoryItem,
  BranchOrder,
  BranchOrderFilters,
  CreateBranchCustomerInput,
  CreateBranchOrderInput,
  CreateBranchRequestInput,
  CreateProductionRunInput,
  ProductionRun,
  ProductionRunFilters,
  UpdateBranchCustomerInput,
} from "@/lib/types/branch";
import type { DeviceCreateInput, PosDevice, PosDeviceActivation } from "@/lib/types/pos";
import { request, requestEnvelope } from "./client";
import { idOrNull, numberFromMeta, optionalText } from "./normalize";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

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

function normalizeProductionRun(r: ProductionRun): ProductionRun {
  return {
    ...r,
    id: String(r.id),
    location_id: String(r.location_id),
    recipe_id: r.recipe_id == null ? null : String(r.recipe_id),
    lines: (r.lines ?? []).map((l) => ({
      ...l,
      id: String(l.id),
      product_id: String(l.product_id),
      quantity: Number(l.quantity),
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
        email: body.email,
        full_name: optionalText(body.full_name),
        position: body.position,
      }),
    });
    return { ...res, user_id: String(res.user_id) };
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

  /** No `branch_id` in the body — the server takes it from the token. */
  async createBranchRequest(body: CreateBranchRequestInput): Promise<StockRequest> {
    return normalizeRequest(
      await request<StockRequest>("/branch/requests", {
        method: "POST",
        body: JSON.stringify({
          kitchen_id: body.kitchen_id,
          notes: optionalText(body.notes),
          lines: body.lines.map((l) => ({
            product_id: l.product_id,
            quantity_requested: l.quantity_requested,
          })),
        }),
      }),
    );
  },

  // ---- Incoming deliveries (from the kitchen) ----

  async listBranchDeliveries(): Promise<BranchDelivery[]> {
    const items = await request<BranchDelivery[]>("/branch/deliveries");
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
    const items = await request<BranchInventoryItem[]>("/branch/inventory");
    return items.map((i) => ({
      ...i,
      id: String(i.id),
      product_id: String(i.product_id),
      quantity: Number(i.quantity),
      batch_code: i.batch_code ?? "",
      location_id: String(i.location_id),
    }));
  },

  // ---- Sub-kitchen production ----

  async listProductionRuns(filters?: ProductionRunFilters): Promise<Paginated<ProductionRun>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? 50;
    const { data, meta } = await requestEnvelope<ProductionRun[]>(
      `/branch/production${qs({ page, page_size: pageSize })}`,
    );
    return {
      items: data.map(normalizeProductionRun),
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", pageSize),
      total: numberFromMeta(meta, "total", data.length),
    };
  },

  async getProductionRun(id: string): Promise<ProductionRun> {
    return normalizeProductionRun(await request<ProductionRun>(`/branch/production/${id}`));
  },

  /** Needs ≥1 INPUT and ≥1 OUTPUT — all-or-nothing (409 invalid_production_run). */
  async createProductionRun(body: CreateProductionRunInput): Promise<ProductionRun> {
    return normalizeProductionRun(
      await request<ProductionRun>("/branch/production", {
        method: "POST",
        body: JSON.stringify({
          note: optionalText(body.note),
          lines: body.lines.map((l) => ({
            product_id: l.product_id,
            role: l.role,
            quantity: l.quantity,
          })),
        }),
      }),
    );
  },
};
