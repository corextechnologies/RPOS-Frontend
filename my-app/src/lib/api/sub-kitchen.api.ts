import type { Paginated } from "@/lib/types/admin";
import type {
  CreateBatchInput,
  CompleteTicketInput,
  PrepBoardFilters,
  PrepTicket,
  UpdatePrepStatusInput,
} from "@/lib/types/sub-kitchen";
import { request, requestEnvelope } from "./client";
import { idOrNull, numberFromMeta } from "./normalize";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

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
};
