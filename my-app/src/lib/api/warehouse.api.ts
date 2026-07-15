import type { Paginated } from "@/lib/types/admin";
import type {
  AdjustStockInput,
  CreatePurchaseOrderInput,
  CreateWarehouseStaffInput,
  CreateWarehouseStaffResult,
  InventoryItem,
  NearExpiryFilters,
  ReceiveStockInput,
  UpdateWarehouseRequestStatusInput,
  WarehouseRequest,
  WarehouseRequestFilters,
  WarehouseStaff,
  WasteStockInput,
} from "@/lib/types/warehouse";
import { request, requestEnvelope } from "./client";
import { idOrNull, numberFromMeta, optionalText } from "./normalize";

/**
 * Backend ids are numeric; the app keys off strings everywhere.
 * Mirrors `normalizeEmployee` / `normalizeSale` in admin.api.ts.
 */
function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    id: String(item.id),
    product_id: String(item.product_id),
    product: {
      ...item.product,
      id: String(item.product.id),
    },
    quantity: Number(item.quantity),
    batch_code: item.batch_code ?? "",
    location_id: String(item.location_id),
  };
}

function normalizeStaff(staff: WarehouseStaff): WarehouseStaff {
  return {
    ...staff,
    id: String(staff.id),
    warehouse_id: String(staff.warehouse_id),
  };
}

function normalizeWarehouseRequest(req: WarehouseRequest): WarehouseRequest {
  return {
    ...req,
    id: String(req.id),
    restaurant_id: String(req.restaurant_id),
    requester_id: idOrNull(req.requester_id),
    assignee_id: idOrNull(req.assignee_id),
    source_location_id: idOrNull(req.source_location_id),
    target_location_id: idOrNull(req.target_location_id),
    line_items: (req.line_items ?? []).map((line) => ({
      ...line,
      id: String(line.id),
      product_id: String(line.product_id),
      quantity_requested: Number(line.quantity_requested),
      quantity_approved:
        line.quantity_approved == null ? null : Number(line.quantity_approved),
    })),
  };
}

/** Both request inboxes page and filter identically; only the path differs. */
async function fetchRequestList(
  path: string,
  filters?: WarehouseRequestFilters,
): Promise<Paginated<WarehouseRequest>> {
  const page = filters?.page ?? 1;
  const page_size = filters?.page_size ?? 20;
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
  });
  if (filters?.status && filters.status !== "all") {
    qs.set("status", filters.status);
  }

  const { data, meta } = await requestEnvelope<WarehouseRequest[]>(
    `${path}?${qs.toString()}`,
  );
  const items = (data ?? []).map(normalizeWarehouseRequest);
  return {
    items,
    page: numberFromMeta(meta, "page", page),
    page_size: numberFromMeta(meta, "page_size", page_size),
    total: numberFromMeta(meta, "total", items.length),
  };
}

/** Live Warehouse API — every call is scoped server-side by the manager's token. */
export const warehouseApi = {
  async listWarehouseInventory(): Promise<InventoryItem[]> {
    const data = await request<InventoryItem[]>("/warehouse/inventory");
    return (data ?? []).map(normalizeInventoryItem);
  },

  async receiveWarehouseStock(body: ReceiveStockInput): Promise<InventoryItem> {
    const data = await request<InventoryItem>("/warehouse/stock/receive", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id,
        quantity: body.quantity,
        batch_code: optionalText(body.batch_code),
        expiry_date: optionalText(body.expiry_date),
        notes: optionalText(body.notes),
      }),
    });
    return normalizeInventoryItem(data);
  },

  async listNearExpiryInventory(
    filters?: NearExpiryFilters,
  ): Promise<InventoryItem[]> {
    const qs =
      filters?.within_days === undefined
        ? ""
        : `?${new URLSearchParams({ within_days: String(filters.within_days) })}`;
    const data = await request<InventoryItem[]>(
      `/warehouse/inventory/near-expiry${qs}`,
    );
    return (data ?? []).map(normalizeInventoryItem);
  },

  async adjustWarehouseStock(body: AdjustStockInput): Promise<InventoryItem> {
    const data = await request<InventoryItem>("/warehouse/stock/adjust", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id,
        quantity_delta: body.quantity_delta,
        batch_code: optionalText(body.batch_code),
        notes: optionalText(body.notes),
      }),
    });
    return normalizeInventoryItem(data);
  },

  async wasteWarehouseStock(body: WasteStockInput): Promise<InventoryItem> {
    const data = await request<InventoryItem>("/warehouse/stock/waste", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id,
        quantity: body.quantity,
        movement_type: body.movement_type,
        batch_code: optionalText(body.batch_code),
        notes: optionalText(body.notes),
      }),
    });
    return normalizeInventoryItem(data);
  },

  async listWarehouseUsers(params?: {
    page?: number;
    page_size?: number;
  }): Promise<Paginated<WarehouseStaff>> {
    const page = params?.page ?? 1;
    const page_size = params?.page_size ?? 20;
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    // Pagination arrives in the envelope's `meta`, not in `data`.
    const { data, meta } = await requestEnvelope<WarehouseStaff[]>(
      `/warehouse/users?${qs.toString()}`,
    );
    const items = (data ?? []).map(normalizeStaff);
    return {
      items,
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", page_size),
      total: numberFromMeta(meta, "total", items.length),
    };
  },

  async createWarehouseUser(
    body: CreateWarehouseStaffInput,
  ): Promise<CreateWarehouseStaffResult> {
    const data = await request<CreateWarehouseStaffResult>("/warehouse/users", {
      method: "POST",
      body: JSON.stringify({
        email: body.email.trim(),
        full_name: optionalText(body.full_name),
      }),
    });
    return {
      ...data,
      user_id: String(data.user_id),
      warehouse_id: String(data.warehouse_id),
    };
  },

  async createWarehousePo(
    body: CreatePurchaseOrderInput,
  ): Promise<WarehouseRequest> {
    const data = await request<WarehouseRequest>("/warehouse/requests/po", {
      method: "POST",
      body: JSON.stringify({
        lines: body.lines.map((line) => ({
          product_id: line.product_id,
          quantity_requested: line.quantity_requested,
        })),
        notes: optionalText(body.notes),
      }),
    });
    return normalizeWarehouseRequest(data);
  },

  async listWarehousePos(
    filters?: WarehouseRequestFilters,
  ): Promise<Paginated<WarehouseRequest>> {
    return fetchRequestList("/warehouse/requests/po", filters);
  },

  async listWarehouseKitchenRequests(
    filters?: WarehouseRequestFilters,
  ): Promise<Paginated<WarehouseRequest>> {
    return fetchRequestList("/warehouse/requests/kitchen", filters);
  },

  async getWarehouseRequest(requestId: string): Promise<WarehouseRequest> {
    const data = await request<WarehouseRequest>(
      `/warehouse/requests/${requestId}`,
    );
    return normalizeWarehouseRequest(data);
  },

  async updateWarehouseRequestStatus(
    requestId: string,
    body: UpdateWarehouseRequestStatusInput,
  ): Promise<WarehouseRequest> {
    const data = await request<WarehouseRequest>(
      `/warehouse/requests/${requestId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          to_status: body.to_status,
          // `line_item_id`, not Admin's `line_id`.
          line_approvals: body.line_approvals?.map((approval) => ({
            line_item_id: approval.line_item_id,
            quantity_approved: approval.quantity_approved,
          })),
          notes: optionalText(body.notes),
          assignee_id: body.assignee_id,
        }),
      },
    );
    return normalizeWarehouseRequest(data);
  },
};
