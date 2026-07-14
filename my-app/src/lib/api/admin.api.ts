import type { Branch, CreateLocationInput } from "@/lib/types/admin";
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
};
