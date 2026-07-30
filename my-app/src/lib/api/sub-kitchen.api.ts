import type { Paginated } from "@/lib/types/admin";
import type { BranchInventoryItem, BranchWasteInput } from "@/lib/types/branch";
import type { WasteEvent, WasteEventFilters } from "@/lib/types/waste";
import type {
  BranchNearExpiryFilters,
  CreateBatchInput,
  CompleteTicketInput,
  CreateSubKitchenRecipeInput,
  PrepBoardFilters,
  PrepTicket,
  SetAvailabilityInput,
  SubKitchenAvailabilityRow,
  SubKitchenRecipe,
  SubKitchenStats,
  SubKitchenStatsFilters,
  UpdatePrepStatusInput,
} from "@/lib/types/sub-kitchen";
import { request, requestEnvelope } from "./client";
import { normalizeBranchInventory, type RawBranchInventoryItem } from "./branch.api";
import { idOrNull, numberFromMeta } from "./normalize";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

function normalizeRecipe(r: SubKitchenRecipe): SubKitchenRecipe {
  return {
    ...r,
    id: String(r.id),
    product_id: Number(r.product_id),
    version: Number(r.version),
    yield_qty: Number(r.yield_qty ?? 1),
    components: (r.components ?? []).map((c) => ({
      ...c,
      component_product_id: Number(c.component_product_id),
      quantity: Number(c.quantity),
      wastage_bp: Number(c.wastage_bp ?? 0),
    })),
  };
}

function normalizeWasteEvent(e: WasteEvent): WasteEvent {
  return {
    ...e,
    id: String(e.id),
    product_id: String(e.product_id),
    product: { ...e.product, id: String(e.product.id) },
    quantity: Number(e.quantity),
    batch_code: e.batch_code ?? "",
    location_id: String(e.location_id),
  };
}

/** Normalize the wire ticket (numeric ids, nullable timestamps) to the read model. */
function normalizePrepTicket(t: PrepTicket): PrepTicket {
  return {
    ...t,
    id: String(t.id),
    branch_id: String(t.branch_id),
    product_id: String(t.product_id),
    quantity: Number(t.quantity),
    order_id: idOrNull(t.order_id),
    order_line_id: idOrNull(t.order_line_id),
    production_run_id: idOrNull(t.production_run_id),
    recipe_id: idOrNull(t.recipe_id),
    priority: Number(t.priority ?? 0),
    customization_note: t.customization_note ?? null,
    note: t.note ?? null,
  };
}

export const subKitchenApi = {
  async listPrepBoard(filters?: PrepBoardFilters): Promise<Paginated<PrepTicket>> {
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 50;
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (filters?.status) params.set("status", filters.status);
    const { data, meta } = await requestEnvelope<PrepTicket[]>(
      `/branch/sub-kitchen/board?${params.toString()}`,
    );
    const items = (data ?? []).map(normalizePrepTicket);
    return {
      items,
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", page_size),
      total: numberFromMeta(meta, "total", items.length),
    };
  },

  async getPrepTicket(id: string): Promise<PrepTicket> {
    const data = await request<PrepTicket>(`/branch/sub-kitchen/tickets/${id}`);
    return normalizePrepTicket(data);
  },

  async createBatchJob(body: CreateBatchInput): Promise<PrepTicket> {
    const data = await request<PrepTicket>("/branch/sub-kitchen/batch", {
      method: "POST",
      ...json(body),
    });
    return normalizePrepTicket(data);
  },

  async updatePrepStatus(id: string, body: UpdatePrepStatusInput): Promise<PrepTicket> {
    const data = await request<PrepTicket>(
      `/branch/sub-kitchen/tickets/${id}/status`,
      { method: "PATCH", ...json(body) },
    );
    return normalizePrepTicket(data);
  },

  async completePrepTicket(id: string, body?: CompleteTicketInput): Promise<PrepTicket> {
    const data = await request<PrepTicket>(
      `/branch/sub-kitchen/tickets/${id}/complete`,
      { method: "POST", ...json(body ?? {}) },
    );
    return normalizePrepTicket(data);
  },

  async cancelPrepTicket(id: string): Promise<PrepTicket> {
    const data = await request<PrepTicket>(
      `/branch/sub-kitchen/tickets/${id}/cancel`,
      { method: "POST" },
    );
    return normalizePrepTicket(data);
  },

  // ---- Recipes ----

  async listSubKitchenRecipes(): Promise<SubKitchenRecipe[]> {
    const data = await request<SubKitchenRecipe[]>("/branch/sub-kitchen/recipes");
    return (data ?? []).map(normalizeRecipe);
  },

  async getSubKitchenRecipe(id: string): Promise<SubKitchenRecipe> {
    const data = await request<SubKitchenRecipe>(`/branch/sub-kitchen/recipes/${id}`);
    return normalizeRecipe(data);
  },

  async createSubKitchenRecipe(
    body: CreateSubKitchenRecipeInput,
  ): Promise<SubKitchenRecipe> {
    const data = await request<SubKitchenRecipe>("/branch/sub-kitchen/recipes", {
      method: "POST",
      ...json(body),
    });
    return normalizeRecipe(data);
  },

  // ---- Waste (same branch ledger, logged from the station) ----

  async logSubKitchenWaste(body: BranchWasteInput): Promise<BranchInventoryItem> {
    const data = await request<RawBranchInventoryItem>("/branch/sub-kitchen/waste", {
      method: "POST",
      ...json(body),
    });
    return normalizeBranchInventory(data);
  },

  async listSubKitchenWaste(filters?: WasteEventFilters): Promise<WasteEvent[]> {
    const suffix = filters?.movement_type
      ? `?movement_type=${filters.movement_type}`
      : "";
    const data = await request<WasteEvent[]>(`/branch/sub-kitchen/waste${suffix}`);
    return (data ?? []).map(normalizeWasteEvent);
  },

  // ---- Sold out (86) ----

  async listSubKitchenAvailability(): Promise<SubKitchenAvailabilityRow[]> {
    const data = await request<SubKitchenAvailabilityRow[]>(
      "/branch/sub-kitchen/availability",
    );
    return (data ?? []).map((row) => ({
      ...row,
      menu_item_id: String(row.menu_item_id),
      is_available: Boolean(row.is_available),
      reason: row.reason ?? null,
      on_hand: row.on_hand == null ? null : Number(row.on_hand),
    }));
  },

  async setSubKitchenAvailability(
    menuItemId: string,
    body: SetAvailabilityInput,
  ): Promise<SubKitchenAvailabilityRow> {
    const row = await request<SubKitchenAvailabilityRow>(
      `/branch/sub-kitchen/availability/${menuItemId}`,
      { method: "PUT", ...json(body) },
    );
    return {
      ...row,
      menu_item_id: String(row.menu_item_id),
      is_available: Boolean(row.is_available),
      reason: row.reason ?? null,
      on_hand: row.on_hand == null ? null : Number(row.on_hand),
    };
  },

  // ---- Stats ----

  async getSubKitchenStats(filters?: SubKitchenStatsFilters): Promise<SubKitchenStats> {
    const params = new URLSearchParams();
    if (filters?.start) params.set("start", filters.start);
    if (filters?.end) params.set("end", filters.end);
    const q = params.toString();
    return request<SubKitchenStats>(`/branch/sub-kitchen/stats${q ? `?${q}` : ""}`);
  },

  // ---- Branch near-expiry (outside the sub-kitchen namespace) ----

  async listBranchNearExpiry(
    filters?: BranchNearExpiryFilters,
  ): Promise<BranchInventoryItem[]> {
    const within = filters?.within_days ?? 7;
    const data = await request<RawBranchInventoryItem[]>(
      `/branch/inventory/near-expiry?within_days=${within}`,
    );
    return (data ?? []).map(normalizeBranchInventory);
  },
};
