import type { Paginated } from "@/lib/types/admin";
import type {
  AdjustStockInput,
  CreateWarehouseStaffInput,
  CreateWarehouseStaffResult,
  InventoryItem,
  NearExpiryFilters,
  ReceiveStockInput,
  WarehouseStaff,
  WasteStockInput,
} from "@/lib/types/warehouse";
import { request, requestEnvelope } from "./client";

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

/**
 * Optional string fields are dropped when blank rather than sent as "".
 * The stock endpoints reject empty-but-present values (`notes` must be at least
 * one character if included), so an omitted key is the only safe encoding.
 */
function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStaff(staff: WarehouseStaff): WarehouseStaff {
  return {
    ...staff,
    id: String(staff.id),
    warehouse_id: String(staff.warehouse_id),
  };
}

function numberFromMeta(
  meta: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  return typeof meta?.[key] === "number" ? (meta[key] as number) : fallback;
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
};
