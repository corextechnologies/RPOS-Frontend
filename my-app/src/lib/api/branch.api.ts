/**
 * The `/v1/branch` surface (Phase 5).
 *
 * Money here is decimal strings, not minor units — these endpoints are
 * deliberately unchanged by the POS work. See `@/lib/types/branch`.
 */

import type { Paginated } from "@/lib/types/admin";
import type {
  BranchCustomer,
  BranchStaff,
  CreateBranchStaffInput,
  CreateBranchStaffResult,
  BranchCustomerFilters,
  BranchInventoryItem,
  BranchOrder,
  BranchOrderFilters,
  CreateBranchCustomerInput,
  CreateBranchOrderInput,
  CreateProductionRunInput,
  ProductionRun,
  ProductionRunFilters,
  UpdateBranchCustomerInput,
} from "@/lib/types/branch";
import { request, requestEnvelope } from "./client";
import { idOrNull, numberFromMeta, optionalText } from "./normalize";

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
