import type {
  Branch,
  CreateAdminUserInput,
  CreateAdminUserResult,
  CreateLocationInput,
  Employee,
  Kitchen,
  Paginated,
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

function toPaginatedEmployees(
  data: Employee[] | Paginated<Employee>,
  meta?: Record<string, unknown>,
  fallbackPage = 1,
  fallbackPageSize = 20,
): Paginated<Employee> {
  if (Array.isArray(data)) {
    const page = typeof meta?.page === "number" ? meta.page : fallbackPage;
    const page_size =
      typeof meta?.page_size === "number" ? meta.page_size : fallbackPageSize;
    const total = typeof meta?.total === "number" ? meta.total : data.length;
    return {
      items: data.map(normalizeEmployee),
      page,
      page_size,
      total,
    };
  }

  return {
    items: (data.items ?? []).map(normalizeEmployee),
    page: data.page ?? (typeof meta?.page === "number" ? meta.page : fallbackPage),
    page_size:
      data.page_size ??
      (typeof meta?.page_size === "number" ? meta.page_size : fallbackPageSize),
    total: data.total ?? (typeof meta?.total === "number" ? meta.total : data.items?.length ?? 0),
  };
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
};
