import type { InventoryItem } from "@/lib/types/warehouse";
import { request } from "./client";

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

/** Live Warehouse API — every call is scoped server-side by the manager's token. */
export const warehouseApi = {
  async listWarehouseInventory(): Promise<InventoryItem[]> {
    const data = await request<InventoryItem[]>("/warehouse/inventory");
    return (data ?? []).map(normalizeInventoryItem);
  },
};
