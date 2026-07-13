import type { BillingOut, BillingSummary } from "@/lib/types/super-admin";
import { billingFromApi } from "./adapters";
import { request } from "./client";

export const adminApi = {
  async getMyBilling(): Promise<BillingSummary> {
    const data = await request<BillingOut>("/admin/billing");
    return billingFromApi(data);
  },
};
