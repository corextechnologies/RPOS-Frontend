import { ApiError } from "@/lib/types/super-admin";
import type { ApiClient } from "./contract";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? body.message ?? res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Live API client stub — mirrors mock contract for future backend wiring. */
export const httpClient: ApiClient = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  listRestaurants: (filters) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.plan_status) params.set("plan_status", filters.plan_status);
    if (filters?.access_status) params.set("access_status", filters.access_status);
    const q = params.toString();
    return request(`/super-admin/restaurants${q ? `?${q}` : ""}`);
  },
  getRestaurant: (id) => request(`/super-admin/restaurants/${id}`),
  getRestaurantStats: () => request("/super-admin/restaurants/stats"),
  createRestaurant: (body) =>
    request("/super-admin/restaurants", { method: "POST", body: JSON.stringify(body) }),
  updateRestaurant: (id, body) =>
    request(`/super-admin/restaurants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteRestaurant: (id) =>
    request(`/super-admin/restaurants/${id}`, { method: "DELETE" }),
  haltPlan: (id) => request(`/super-admin/restaurants/${id}/halt`, { method: "POST" }),
  activatePlan: (id) =>
    request(`/super-admin/restaurants/${id}/activate`, { method: "POST" }),
  revokeAdminAccess: (id) =>
    request(`/super-admin/restaurants/${id}/revoke`, { method: "POST" }),
  restoreAdminAccess: (id) =>
    request(`/super-admin/restaurants/${id}/restore`, { method: "POST" }),
  getBilling: (id) => request(`/super-admin/restaurants/${id}/billing`),
  listInvoices: (id) => request(`/super-admin/restaurants/${id}/invoices`),
  shareInvoice: (invoiceId) =>
    request(`/super-admin/invoices/${invoiceId}/share`, { method: "POST" }),
  unshareInvoice: (invoiceId) =>
    request(`/super-admin/invoices/${invoiceId}/unshare`, { method: "POST" }),
};
