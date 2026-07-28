import type { Paginated } from "@/lib/types/admin";
import type {
  AdjustStockInput,
  CreatePurchaseOrderInput,
  CreateWarehouseProductInput,
  CreateWarehouseStaffInput,
  CreateWarehouseStaffResult,
  UpdateWarehouseProductInput,
  UpdateWarehouseStaffInput,
  InventoryItem,
  NearExpiryFilters,
  ReceiveStockInput,
  ReorderLevel,
  UpdateReorderLevelInput,
  UpdateStockExpiryInput,
  UpdateWarehouseRequestStatusInput,
  WarehouseProduct,
  WarehouseProductFilters,
  WarehouseRequest,
  WarehouseRequestFilters,
  WarehouseStaff,
  WasteStockInput,
} from "@/lib/types/warehouse";
import type {
  WasteEvent,
  WasteEventFilters,
  UpdateWasteEventInput,
} from "@/lib/types/waste";
import { request, requestEnvelope } from "./client";
import { staffProfileBody } from "./staff-body";
import { idOrNull, numberFromMeta, optionalText } from "./normalize";

/** Backend ids are numeric; normalize a waste record to the app's string ids. */
function normalizeWasteEvent(event: WasteEvent): WasteEvent {
  return {
    ...event,
    id: String(event.id),
    product_id: String(event.product_id),
    product: { ...event.product, id: String(event.product.id) },
    quantity: Number(event.quantity),
    batch_code: event.batch_code ?? "",
    location_id: String(event.location_id),
  };
}

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
      units_per_pack:
        item.product.units_per_pack == null ||
        item.product.units_per_pack === undefined
          ? null
          : Number(item.product.units_per_pack),
    },
    quantity: Number(item.quantity),
    batch_code: item.batch_code ?? "",
    location_id: String(item.location_id),
  };
}

function normalizeProduct(product: WarehouseProduct): WarehouseProduct {
  return {
    ...product,
    id: String(product.id),
    units_per_pack:
      product.units_per_pack == null || product.units_per_pack === undefined
        ? null
        : Number(product.units_per_pack),
  };
}

function normalizeStaff(staff: WarehouseStaff): WarehouseStaff {
  return {
    ...staff,
    id: String(staff.id),
    warehouse_id: String(staff.warehouse_id),
    full_name: staff.full_name ?? null,
    job_title: staff.job_title ?? null,
    phone_number: staff.phone_number ?? null,
    address: staff.address ?? null,
    image_url: staff.image_url ?? null,
    cnic_front_url: staff.cnic_front_url ?? null,
    cnic_back_url: staff.cnic_back_url ?? null,
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
      // Null until a PO is reported or received; both are real values, not
      // missing data, so they are preserved rather than defaulted.
      quantity_received:
        line.quantity_received == null ? null : Number(line.quantity_received),
      issue_note: line.issue_note ?? null,
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
        // Optional low-stock limit, upserted alongside the intake.
        reorder_level: body.reorder_level,
      }),
    });
    return normalizeInventoryItem(data);
  },

  async listWarehouseProducts(filters?: WarehouseProductFilters): Promise<WarehouseProduct[]> {
    // Not paginated: no meta, and `data` is the whole catalog.
    const qs = filters?.kind ? `?kind=${filters.kind}` : "";
    const data = await request<WarehouseProduct[]>(`/warehouse/products${qs}`);
    return (data ?? []).map(normalizeProduct);
  },

  async createWarehouseProduct(
    body: CreateWarehouseProductInput,
  ): Promise<WarehouseProduct> {
    const data = await request<WarehouseProduct>("/warehouse/products", {
      method: "POST",
      body: JSON.stringify({
        name: body.name.trim(),
        sku: optionalText(body.sku),
        // Omitted means RAW_MATERIAL server-side; sent only when the user
        // actually chose otherwise.
        ...(body.kind ? { kind: body.kind } : {}),
        // Omitted means EACH server-side.
        ...(body.stock_unit ? { stock_unit: body.stock_unit } : {}),
        ...(body.units_per_pack != null && body.units_per_pack !== undefined
          ? { units_per_pack: body.units_per_pack }
          : {}),
      }),
    });
    return normalizeProduct(data);
  },

  async updateWarehouseProduct(
    productId: string,
    body: UpdateWarehouseProductInput,
  ): Promise<WarehouseProduct> {
    // Partial PATCH: only fields the caller actually touched are sent, so an
    // edit that fills in a SKU never re-asserts (or clears) the name. There is
    // no quantity field to send — stock lives on a separate endpoint.
    const payload: Record<string, unknown> = {};
    if (body.name !== undefined) payload.name = body.name.trim();
    // `null`/"" clears the SKU; a real value is trimmed. `undefined` = untouched.
    if (body.sku !== undefined) payload.sku = optionalText(body.sku ?? undefined) ?? null;
    if (body.kind !== undefined) payload.kind = body.kind;
    if (body.stock_unit !== undefined) payload.stock_unit = body.stock_unit;
    if (body.units_per_pack !== undefined) payload.units_per_pack = body.units_per_pack;
    const data = await request<WarehouseProduct>(
      `/warehouse/products/${productId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    return normalizeProduct(data);
  },

  async setWarehouseReorderLevel(
    productId: string,
    body: UpdateReorderLevelInput,
  ): Promise<ReorderLevel> {
    const data = await request<ReorderLevel>(
      `/warehouse/products/${productId}/reorder-level`,
      {
        method: "PUT",
        body: JSON.stringify({ reorder_level: body.reorder_level }),
      },
    );
    return {
      ...data,
      product_id: String(data.product_id),
      location_id: String(data.location_id),
      reorder_level: Number(data.reorder_level),
    };
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

  async updateWarehouseStockExpiry(
    itemId: string,
    body: UpdateStockExpiryInput,
  ): Promise<InventoryItem> {
    const data = await request<InventoryItem>(
      `/warehouse/inventory/${itemId}`,
      {
        method: "PATCH",
        // Explicit null clears the date; a value sets it. Never sends quantity.
        body: JSON.stringify({ expiry_date: body.expiry_date }),
      },
    );
    return normalizeInventoryItem(data);
  },

  async wasteWarehouseStock(body: WasteStockInput): Promise<InventoryItem> {
    const data = await request<InventoryItem>("/warehouse/stock/waste", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id,
        quantity: body.quantity,
        // Optional on this endpoint, but always sent — see WasteStockInput.
        waste_reason: body.waste_reason,
        movement_type: body.movement_type,
        batch_code: optionalText(body.batch_code),
        notes: optionalText(body.notes),
      }),
    });
    return normalizeInventoryItem(data);
  },

  async listWarehouseWasteEvents(
    filters?: WasteEventFilters,
  ): Promise<WasteEvent[]> {
    // The write-off history for this warehouse. Scoped server-side; the only
    // filter the warehouse itself sets is the movement type.
    const qs = filters?.movement_type
      ? `?movement_type=${filters.movement_type}`
      : "";
    const data = await request<WasteEvent[]>(`/warehouse/stock/waste${qs}`);
    return (data ?? []).map(normalizeWasteEvent);
  },

  async updateWarehouseWasteEvent(
    eventId: string,
    body: UpdateWasteEventInput,
  ): Promise<WasteEvent> {
    // Partial PATCH: only the corrected fields are sent.
    const payload: Record<string, unknown> = {};
    if (body.quantity !== undefined) payload.quantity = body.quantity;
    if (body.movement_type !== undefined) payload.movement_type = body.movement_type;
    if (body.waste_reason !== undefined) payload.waste_reason = body.waste_reason;
    if (body.notes !== undefined)
      payload.notes = optionalText(body.notes ?? undefined) ?? null;
    const data = await request<WasteEvent>(
      `/warehouse/stock/waste/${eventId}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    return normalizeWasteEvent(data);
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
        ...staffProfileBody(body),
        email: body.email.trim(),
        job_title: body.job_title?.trim() ?? "",
      }),
    });
    return {
      ...data,
      user_id: String(data.user_id),
      warehouse_id: String(data.warehouse_id),
    };
  },

  // No revoke/restore: warehouse staff cannot sign in, so there is no access to
  // revoke — those routes 404.

  async deleteWarehouseUser(id: string): Promise<void> {
    await request<{ detail: string }>(`/warehouse/users/${id}`, { method: "DELETE" });
  },

  async updateWarehouseUser(id: string, body: UpdateWarehouseStaffInput): Promise<WarehouseStaff> {
    const data = await request<WarehouseStaff>(`/warehouse/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return normalizeStaff(data);
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
          line_approvals: body.line_approvals?.map((approval) => ({
            line_item_id: approval.line_item_id,
            quantity_approved: approval.quantity_approved,
          })),
          // Required for a PO reaching RECEIVED or REPORTED.
          line_receipts: body.line_receipts?.map((receipt) => ({
            line_item_id: receipt.line_item_id,
            quantity_received: receipt.quantity_received,
            batch_code: optionalText(receipt.batch_code),
            expiry_date: optionalText(receipt.expiry_date),
            issue_note: optionalText(receipt.issue_note),
          })),
          notes: optionalText(body.notes),
          assignee_id: body.assignee_id,
        }),
      },
    );
    return normalizeWarehouseRequest(data);
  },
};
