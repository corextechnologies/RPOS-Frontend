import type {
  Branch,
  CreateLocationInput,
  Kitchen,
  Warehouse,
} from "@/lib/types/admin";
import type { BillingOut, BillingSummary } from "@/lib/types/super-admin";
import { billingFromApi } from "./adapters";
import { request } from "./client";

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
};
