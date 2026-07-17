import type {
  AdminInventoryFilters,
  AdminInventoryItem,
  ProductKind,
  AdminProfile,
  AdminRequestType,
  Branch,
  CreateAdminUserInput,
  CreateAdminUserResult,
  CreateLocationInput,
  CreateSaleInput,
  Employee,
  Kitchen,
  Paginated,
  ProductPricing,
  ProductPricingFilters,
  RequestFilters,
  SalesRecord,
  SalesRecordFilters,
  SalesSummary,
  SalesSummaryFilters,
  StockRequest,
  UpdateAdminProfileInput,
  UpdateAdminUserInput,
  UpdateLocationInput,
  UpdateProductPricingInput,
  UpdateRequestStatusInput,
  Warehouse,
} from "@/lib/types/admin";
import type { BillingOut, BillingSummary } from "@/lib/types/super-admin";
import { billingFromApi } from "./adapters";
import { apiConfig } from "./config";
import { request } from "./client";
import { parseApiError } from "./envelope";
import { tokens } from "./tokens";

function normalizeEmployee(e: Employee): Employee {
  return {
    ...e,
    id: String(e.id),
    branch_id: e.branch_id != null ? String(e.branch_id) : e.branch_id,
    kitchen_id: e.kitchen_id != null ? String(e.kitchen_id) : e.kitchen_id,
    warehouse_id: e.warehouse_id != null ? String(e.warehouse_id) : e.warehouse_id,
  };
}

function normalizeSale(s: SalesRecord): SalesRecord {
  return {
    ...s,
    id: String(s.id),
    restaurant_id: String(s.restaurant_id),
    branch_id: s.branch_id != null ? String(s.branch_id) : s.branch_id,
    amount: String(s.amount),
  };
}

function normalizeSalesSummary(s: SalesSummary): SalesSummary {
  return {
    period: s.period,
    total_amount: String(s.total_amount),
    total_count: Number(s.total_count),
    buckets: (s.buckets ?? []).map((b) => ({
      period_start: b.period_start,
      total_amount: String(b.total_amount),
      count: Number(b.count),
    })),
  };
}

/**
 * The wire calls this field `request_type`; the Admin app has always called it
 * `type`. One serializer serves every portal, so the raw payload is the same
 * shape the Kitchen and Warehouse portals receive.
 *
 * The mock returns `type` directly, which is why the mismatch stayed invisible
 * until the app was pointed at the live API. Both spellings are accepted here
 * rather than renaming the field across the Admin UI.
 */
type RawStockRequest = StockRequest & { request_type?: AdminRequestType };

function normalizeStockRequest(r: RawStockRequest): StockRequest {
  const { request_type, ...rest } = r;
  return {
    ...rest,
    id: String(r.id),
    type: r.type ?? (request_type as AdminRequestType),
    line_items: (r.line_items ?? []).map((line) => ({
      ...line,
      id: String(line.id),
      product_id: line.product_id != null ? String(line.product_id) : line.product_id,
    })),
  };
}

function toPaginated<T>(
  data: T[] | Paginated<T>,
  mapItem: (item: T) => T,
  meta?: Record<string, unknown>,
  fallbackPage = 1,
  fallbackPageSize = 20,
): Paginated<T> {
  if (Array.isArray(data)) {
    const page = typeof meta?.page === "number" ? meta.page : fallbackPage;
    const page_size =
      typeof meta?.page_size === "number" ? meta.page_size : fallbackPageSize;
    const total = typeof meta?.total === "number" ? meta.total : data.length;
    return {
      items: data.map(mapItem),
      page,
      page_size,
      total,
    };
  }

  return {
    items: (data.items ?? []).map(mapItem),
    page: data.page ?? (typeof meta?.page === "number" ? meta.page : fallbackPage),
    page_size:
      data.page_size ??
      (typeof meta?.page_size === "number" ? meta.page_size : fallbackPageSize),
    total: data.total ?? (typeof meta?.total === "number" ? meta.total : data.items?.length ?? 0),
  };
}

function toPaginatedEmployees(
  data: Employee[] | Paginated<Employee>,
  meta?: Record<string, unknown>,
  fallbackPage = 1,
  fallbackPageSize = 20,
): Paginated<Employee> {
  return toPaginated(data, normalizeEmployee, meta, fallbackPage, fallbackPageSize);
}

function toPaginatedRequests(
  data: StockRequest[] | Paginated<StockRequest>,
  meta?: Record<string, unknown>,
  fallbackPage = 1,
  fallbackPageSize = 20,
): Paginated<StockRequest> {
  return toPaginated(data, normalizeStockRequest, meta, fallbackPage, fallbackPageSize);
}

/** Fetches envelope with meta so pagination can live in data or meta. */
async function adminGetEnvelope<T>(
  path: string,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiConfig.isNgrok) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
  const access = tokens.access;
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${apiConfig.baseUrl}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw parseApiError(body, res.status);
  }
  const json = await res.json();
  if (json !== null && typeof json === "object" && "data" in json) {
    const env = json as { data: T; meta?: Record<string, unknown> };
    return { data: env.data, meta: env.meta };
  }
  return { data: json as T };
}

function requestListQuery(filters?: RequestFilters): string {
  const qs = new URLSearchParams();
  const page = filters?.page ?? 1;
  const page_size = filters?.page_size ?? 20;
  qs.set("page", String(page));
  qs.set("page_size", String(page_size));
  if (filters?.status && filters.status !== "all") {
    qs.set("status", filters.status);
  }
  return qs.toString();
}

/**
 * Money stays a decimal string end to end — parsing it to a float loses
 * precision, and these values round-trip back to the server on the next PATCH.
 *
 * `is_available` defaults to true when the server omits it: a product with no
 * opinion is sellable, which matches the column's server-side default.
 */
function normalizePricing(p: ProductPricing): ProductPricing {
  const kind: ProductKind = p.kind ?? "RAW_MATERIAL";
  return {
    ...p,
    id: String(p.id),
    kind,
    // Read the server's answer; fall back to deriving it only if an older
    // payload omits the field. Two rules would be one too many.
    is_sellable: p.is_sellable ?? kind !== "RAW_MATERIAL",
    cost_price: p.cost_price == null ? null : String(p.cost_price),
    selling_price: p.selling_price == null ? null : String(p.selling_price),
    category: p.category ?? null,
    is_available: p.is_available ?? true,
  };
}

export const adminApi = {
  async getMyBilling(): Promise<BillingSummary> {
    const data = await request<BillingOut>("/admin/billing");
    return billingFromApi(data);
  },

  async listBranches(): Promise<Branch[]> {
    const data = await request<Branch[]>("/admin/branches");
    return data.map((b) => ({
      ...b,
      id: String(b.id),
      restaurant_id: String(b.restaurant_id),
    }));
  },

  async createBranch(body: CreateLocationInput): Promise<Branch> {
    const data = await request<Branch>("/admin/branches", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      ...data,
      id: String(data.id),
      restaurant_id: String(data.restaurant_id),
    };
  },

  async updateBranch(id: string, body: UpdateLocationInput): Promise<Branch> {
    const data = await request<Branch>(`/admin/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return {
      ...data,
      id: String(data.id),
      restaurant_id: String(data.restaurant_id),
    };
  },

  async deleteBranch(id: string): Promise<void> {
    await request<{ detail: string }>(`/admin/branches/${id}`, { method: "DELETE" });
  },

  async listKitchens(): Promise<Kitchen[]> {
    const data = await request<Kitchen[]>("/admin/kitchens");
    return data.map((k) => ({
      ...k,
      id: String(k.id),
      restaurant_id: String(k.restaurant_id),
    }));
  },

  async createKitchen(body: CreateLocationInput): Promise<Kitchen> {
    const data = await request<Kitchen>("/admin/kitchens", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      ...data,
      id: String(data.id),
      restaurant_id: String(data.restaurant_id),
    };
  },

  async updateKitchen(id: string, body: UpdateLocationInput): Promise<Kitchen> {
    const data = await request<Kitchen>(`/admin/kitchens/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return {
      ...data,
      id: String(data.id),
      restaurant_id: String(data.restaurant_id),
    };
  },

  async deleteKitchen(id: string): Promise<void> {
    await request<{ detail: string }>(`/admin/kitchens/${id}`, { method: "DELETE" });
  },

  async listWarehouses(): Promise<Warehouse[]> {
    const data = await request<Warehouse[]>("/admin/warehouses");
    return data.map((w) => ({
      ...w,
      id: String(w.id),
      restaurant_id: String(w.restaurant_id),
    }));
  },

  async createWarehouse(body: CreateLocationInput): Promise<Warehouse> {
    const data = await request<Warehouse>("/admin/warehouses", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      ...data,
      id: String(data.id),
      restaurant_id: String(data.restaurant_id),
    };
  },

  async updateWarehouse(id: string, body: UpdateLocationInput): Promise<Warehouse> {
    const data = await request<Warehouse>(`/admin/warehouses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return {
      ...data,
      id: String(data.id),
      restaurant_id: String(data.restaurant_id),
    };
  },

  async deleteWarehouse(id: string): Promise<void> {
    await request<{ detail: string }>(`/admin/warehouses/${id}`, { method: "DELETE" });
  },

  async listEmployees(params?: {
    page?: number;
    page_size?: number;
  }): Promise<Paginated<Employee>> {
    const page = params?.page ?? 1;
    const page_size = params?.page_size ?? 20;
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    const { data, meta } = await adminGetEnvelope<Employee[] | Paginated<Employee>>(
      `/admin/employees?${qs.toString()}`,
    );
    return toPaginatedEmployees(data, meta, page, page_size);
  },

  async createUser(body: CreateAdminUserInput): Promise<CreateAdminUserResult> {
    const data = await request<CreateAdminUserResult>("/admin/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return {
      ...data,
      user_id: String(data.user_id),
    };
  },

  async updateUser(id: string, body: UpdateAdminUserInput): Promise<Employee> {
    const data = await request<Employee>(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return normalizeEmployee(data);
  },

  async revokeUser(id: string): Promise<Employee> {
    const data = await request<Employee>(`/admin/users/${id}/revoke`, { method: "POST" });
    return normalizeEmployee(data);
  },

  async restoreUser(id: string): Promise<Employee> {
    const data = await request<Employee>(`/admin/users/${id}/restore`, { method: "POST" });
    return normalizeEmployee(data);
  },

  async deleteUser(id: string): Promise<void> {
    await request<{ detail: string }>(`/admin/users/${id}`, { method: "DELETE" });
  },

  async getAdminSettings(): Promise<AdminProfile> {
    const data = await request<AdminProfile>("/admin/settings");
    return { ...data, id: String(data.id) };
  },

  async updateAdminSettings(body: UpdateAdminProfileInput): Promise<AdminProfile> {
    const data = await request<AdminProfile>("/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return { ...data, id: String(data.id) };
  },

  async listProductPricing(
    filters?: ProductPricingFilters,
  ): Promise<ProductPricing[]> {
    // Only send the param when narrowing: an absent `unpriced` means "all
    // products", and `unpriced=false` is not the same request.
    // Only send params when narrowing: an absent `unpriced` means "all
    // products", and `unpriced=false` is not the same request.
    const qs = new URLSearchParams();
    if (filters?.unpriced) qs.set("unpriced", "true");
    if (filters?.kind) qs.set("kind", filters.kind);
    if (filters?.sellable_only) qs.set("sellable_only", "true");
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const data = await request<ProductPricing[]>(`/admin/products/pricing${suffix}`);
    return data.map(normalizePricing);
  },

  async listAdminInventory(
    filters?: AdminInventoryFilters,
  ): Promise<AdminInventoryItem[]> {
    const qs = new URLSearchParams();
    if (filters?.location_type) qs.set("location_type", filters.location_type);
    if (filters?.location_id) qs.set("location_id", filters.location_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    // Not paginated. This is the only inventory response carrying cost_price.
    const data = await request<AdminInventoryItem[]>(`/admin/inventory${suffix}`);
    return (data ?? []).map((item) => ({
      ...item,
      id: String(item.id),
      product_id: String(item.product_id),
      product: {
        ...item.product,
        id: String(item.product.id),
        cost_price:
          item.product.cost_price == null ? null : String(item.product.cost_price),
      },
      quantity: Number(item.quantity),
      batch_code: item.batch_code ?? "",
      location_id: String(item.location_id),
    }));
  },

  async listAdminKitchenRequests(
    filters?: RequestFilters,
  ): Promise<Paginated<StockRequest>> {
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;
    const { data, meta } = await adminGetEnvelope<
      StockRequest[] | Paginated<StockRequest>
    >(`/admin/requests/kitchen?${requestListQuery(filters)}`);
    return toPaginatedRequests(data, meta, page, page_size);
  },

  /**
   * Partial by contract: keys present in `body` are written, keys absent are
   * left alone, and an explicit `null` clears. `JSON.stringify` drops
   * `undefined` values for us, so "absent" is expressible — but only if the
   * caller passes `undefined` rather than `null` for "don't touch this". See
   * `UpdateProductPricingInput`.
   */
  async updateProductPricing(
    productId: string,
    body: UpdateProductPricingInput,
  ): Promise<ProductPricing> {
    const data = await request<ProductPricing>(`/admin/products/${productId}/pricing`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return normalizePricing(data);
  },

  async listProductRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>> {
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;
    const { data, meta } = await adminGetEnvelope<StockRequest[] | Paginated<StockRequest>>(
      `/admin/requests/products?${requestListQuery(filters)}`,
    );
    return toPaginatedRequests(data, meta, page, page_size);
  },

  async listDistributionRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>> {
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;
    const { data, meta } = await adminGetEnvelope<StockRequest[] | Paginated<StockRequest>>(
      `/admin/requests/distribution?${requestListQuery(filters)}`,
    );
    return toPaginatedRequests(data, meta, page, page_size);
  },

  async getRequest(requestId: string): Promise<StockRequest> {
    const data = await request<StockRequest>(`/admin/requests/${requestId}`);
    return normalizeStockRequest(data);
  },

  async updateRequestStatus(
    requestId: string,
    body: UpdateRequestStatusInput,
  ): Promise<StockRequest> {
    const data = await request<StockRequest>(`/admin/requests/${requestId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return normalizeStockRequest(data);
  },

  async recordSale(body: CreateSaleInput): Promise<SalesRecord> {
    const data = await request<SalesRecord>("/admin/sales", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return normalizeSale(data);
  },

  async listSalesRecords(filters?: SalesRecordFilters): Promise<Paginated<SalesRecord>> {
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 50;
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (filters?.branch_id) qs.set("branch_id", filters.branch_id);
    const { data, meta } = await adminGetEnvelope<SalesRecord[] | Paginated<SalesRecord>>(
      `/admin/sales/records?${qs.toString()}`,
    );
    return toPaginated(data, normalizeSale, meta, page, page_size);
  },

  async getSalesSummary(filters?: SalesSummaryFilters): Promise<SalesSummary> {
    const qs = new URLSearchParams();
    qs.set("period", filters?.period ?? "daily");
    if (filters?.start) qs.set("start", filters.start);
    if (filters?.end) qs.set("end", filters.end);
    if (filters?.branch_id) qs.set("branch_id", filters.branch_id);
    const data = await request<SalesSummary>(`/admin/sales/summary?${qs.toString()}`);
    return normalizeSalesSummary(data);
  },
};
