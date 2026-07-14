import type {
  BillingOut,
  BillingSummary,
  CreateRestaurantInput,
  CreateRestaurantResult,
  Invoice,
  InvoiceOut,
  Restaurant,
  RestaurantCreateResult,
  RestaurantFilters,
  RestaurantOut,
  UpdateRestaurantInput,
} from "@/lib/types/super-admin";
import { ApiError } from "@/lib/types/super-admin";
import {
  billingFromApi,
  createInputToApi,
  createResultFromApi,
  invoiceFromApi,
  restaurantFromApi,
  updateInputToApi,
} from "./adapters";
import { request } from "./client";

export const restaurantsApi = {
  async listRestaurants(_filters?: RestaurantFilters): Promise<Restaurant[]> {
    const data = await request<RestaurantOut[]>("/super-admin/restaurants");
    return data.map(restaurantFromApi);
  },

  async getRestaurant(id: string): Promise<Restaurant> {
    const data = await request<RestaurantOut>(`/super-admin/restaurants/${id}`);
    return restaurantFromApi(data);
  },

  async createRestaurant(body: CreateRestaurantInput): Promise<CreateRestaurantResult> {
    const data = await request<RestaurantCreateResult>("/super-admin/restaurants", {
      method: "POST",
      body: JSON.stringify(createInputToApi(body)),
    });
    return createResultFromApi(data);
  },

  async updateRestaurant(id: string, body: UpdateRestaurantInput): Promise<Restaurant> {
    const patch = updateInputToApi(body);
    if (Object.keys(patch).length === 0) {
      return this.getRestaurant(id);
    }
    const data = await request<RestaurantOut>(`/super-admin/restaurants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return restaurantFromApi(data);
  },

  async haltPlan(id: string): Promise<Restaurant> {
    const data = await request<RestaurantOut>(`/super-admin/restaurants/${id}/halt`, {
      method: "POST",
    });
    return restaurantFromApi(data);
  },

  async activatePlan(id: string): Promise<Restaurant> {
    const data = await request<RestaurantOut>(`/super-admin/restaurants/${id}/activate`, {
      method: "POST",
    });
    return restaurantFromApi(data);
  },

  async getBilling(restaurantId: string): Promise<BillingSummary> {
    const restaurant = await this.getRestaurant(restaurantId);
    const data = await request<BillingOut>(`/super-admin/restaurants/${restaurantId}/billing`);
    return billingFromApi(data, restaurant);
  },

  async runBillingCycle(): Promise<{ generated: number }> {
    return request<{ generated: number }>("/super-admin/billing/run-cycle", {
      method: "POST",
    });
  },

  async recordRestaurantPayment(restaurantId: string): Promise<BillingSummary> {
    await request(`/super-admin/restaurants/${restaurantId}/billing/record-payment`, {
      method: "POST",
    });
    return this.getBilling(restaurantId);
  },

  async updateInvoice(
    restaurantId: string,
    invoiceId: string,
    body: { paid: boolean },
  ): Promise<Invoice> {
    const data = await request<InvoiceOut>(
      `/super-admin/restaurants/${restaurantId}/invoices/${invoiceId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return invoiceFromApi(data);
  },

  async getRestaurantStats(): Promise<never> {
    throw new ApiError("Stats endpoint not available in live API", 501);
  },

  async deleteRestaurant(_id: string): Promise<never> {
    throw new ApiError("Delete not available in Phase 1", 501);
  },

  async revokeAdminAccess(_restaurantId: string): Promise<never> {
    throw new ApiError("Revoke access not available in Phase 1", 501);
  },

  async restoreAdminAccess(_restaurantId: string): Promise<never> {
    throw new ApiError("Restore access not available in Phase 1", 501);
  },

  async listInvoices(restaurantId: string): Promise<Invoice[]> {
    const billing = await this.getBilling(restaurantId);
    return billing.invoices ?? [];
  },

  async shareInvoice(_invoiceId: string): Promise<never> {
    throw new ApiError("Invoice sharing is not available", 501);
  },

  async unshareInvoice(_invoiceId: string): Promise<never> {
    throw new ApiError("Invoice sharing is not available", 501);
  },
};
