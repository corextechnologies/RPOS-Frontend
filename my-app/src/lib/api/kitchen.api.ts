import type { Paginated } from "@/lib/types/admin";
import type {
  CreateKitchenCountInput,
  CreateKitchenStaffInput,
  CreateKitchenStaffResult,
  CreateKitchenWarehouseRequestInput,
  KitchenCountFilters,
  KitchenInventoryItem,
  KitchenLabel,
  KitchenLabelFilters,
  KitchenNearExpiryFilters,
  KitchenRequest,
  KitchenRequestFilters,
  KitchenStaff,
  KitchenStockCount,
  KitchenWarehouse,
  KitchenWasteInput,
  UpdateKitchenRequestStatusInput,
} from "@/lib/types/kitchen";
import { request, requestEnvelope } from "./client";
import { idOrNull, numberFromMeta, optionalText } from "./normalize";

function normalizeInventoryItem(item: KitchenInventoryItem): KitchenInventoryItem {
  return {
    ...item,
    id: String(item.id),
    product_id: String(item.product_id),
    product: {
      ...item.product,
      id: String(item.product.id),
    },
    quantity: Number(item.quantity),
    // The API sends "" for unbatched stock, but null is just as plausible on a
    // row that never had a batch; collapse both so the UI has one thing to test.
    batch_code: item.batch_code ?? "",
    location_id: String(item.location_id),
  };
}

function normalizeLabel(label: KitchenLabel): KitchenLabel {
  return {
    ...label,
    product_id: String(label.product_id),
    batch_code: label.batch_code ?? "",
    quantity: Number(label.quantity),
    location_id: String(label.location_id),
  };
}

function normalizeStaff(staff: KitchenStaff): KitchenStaff {
  return {
    ...staff,
    id: String(staff.id),
    kitchen_id: String(staff.kitchen_id),
  };
}

function normalizeCount(count: KitchenStockCount): KitchenStockCount {
  return {
    ...count,
    id: String(count.id),
    location_id: String(count.location_id),
    counted_by_id: idOrNull(count.counted_by_id),
    lines: (count.lines ?? []).map((line) => ({
      ...line,
      id: String(line.id),
      product_id: String(line.product_id),
      counted_quantity: Number(line.counted_quantity),
      system_quantity: Number(line.system_quantity),
      variance: Number(line.variance),
    })),
  };
}

function normalizeKitchenRequest(req: KitchenRequest): KitchenRequest {
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
      // Stays null for the whole KITCHEN_TO_WAREHOUSE lifecycle — that is a real
      // value meaning "no partial approval on this type", not missing data.
      quantity_approved:
        line.quantity_approved == null ? null : Number(line.quantity_approved),
    })),
  };
}

/** Both request inboxes page and filter identically; only the path differs. */
async function fetchRequestList(
  path: string,
  filters?: KitchenRequestFilters,
): Promise<Paginated<KitchenRequest>> {
  const page = filters?.page ?? 1;
  const page_size = filters?.page_size ?? 20;
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
  });
  if (filters?.status && filters.status !== "all") {
    qs.set("status", filters.status);
  }

  const { data, meta } = await requestEnvelope<KitchenRequest[]>(
    `${path}?${qs.toString()}`,
  );
  const items = (data ?? []).map(normalizeKitchenRequest);
  return {
    items,
    page: numberFromMeta(meta, "page", page),
    page_size: numberFromMeta(meta, "page_size", page_size),
    total: numberFromMeta(meta, "total", items.length),
  };
}

/** Live Kitchen API — every call is scoped server-side by the caller's token. */
export const kitchenApi = {
  async listKitchenInventory(): Promise<KitchenInventoryItem[]> {
    // Not paginated: no meta, and `data` is the whole on-hand list.
    const data = await request<KitchenInventoryItem[]>("/kitchen/inventory");
    return (data ?? []).map(normalizeInventoryItem);
  },

  async listKitchenNearExpiry(
    filters?: KitchenNearExpiryFilters,
  ): Promise<KitchenInventoryItem[]> {
    const qs =
      filters?.within_days === undefined
        ? ""
        : `?${new URLSearchParams({ within_days: String(filters.within_days) })}`;
    const data = await request<KitchenInventoryItem[]>(
      `/kitchen/inventory/near-expiry${qs}`,
    );
    return (data ?? []).map(normalizeInventoryItem);
  },

  async listKitchenLabels(filters?: KitchenLabelFilters): Promise<KitchenLabel[]> {
    const qs = new URLSearchParams();
    if (filters?.product_id) qs.set("product_id", filters.product_id);
    // An empty batch_code filter is a real query ("unbatched"), but the API reads
    // an absent param as "no filter", so only send it when the user typed one.
    const batch = optionalText(filters?.batch_code);
    if (batch) qs.set("batch_code", batch);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const data = await request<KitchenLabel[]>(`/kitchen/inventory/labels${suffix}`);
    return (data ?? []).map(normalizeLabel);
  },

  async wasteKitchenStock(body: KitchenWasteInput): Promise<KitchenInventoryItem> {
    const data = await request<KitchenInventoryItem>("/kitchen/stock/waste", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id,
        quantity: body.quantity,
        // Required here, unlike the Warehouse's waste endpoint.
        waste_reason: body.waste_reason,
        movement_type: body.movement_type,
        batch_code: optionalText(body.batch_code),
        notes: optionalText(body.notes),
      }),
    });
    return normalizeInventoryItem(data);
  },

  async createKitchenCount(
    body: CreateKitchenCountInput,
  ): Promise<KitchenStockCount> {
    const data = await request<KitchenStockCount>("/kitchen/stock/counts", {
      method: "POST",
      body: JSON.stringify({
        notes: optionalText(body.notes),
        lines: body.lines.map((line) => ({
          product_id: line.product_id,
          counted_quantity: line.counted_quantity,
          batch_code: optionalText(line.batch_code),
        })),
      }),
    });
    return normalizeCount(data);
  },

  async listKitchenCounts(
    filters?: KitchenCountFilters,
  ): Promise<Paginated<KitchenStockCount>> {
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    const { data, meta } = await requestEnvelope<KitchenStockCount[]>(
      `/kitchen/stock/counts?${qs.toString()}`,
    );
    const items = (data ?? []).map(normalizeCount);
    return {
      items,
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", page_size),
      total: numberFromMeta(meta, "total", items.length),
    };
  },

  async listKitchenUsers(params?: {
    page?: number;
    page_size?: number;
  }): Promise<Paginated<KitchenStaff>> {
    const page = params?.page ?? 1;
    const page_size = params?.page_size ?? 20;
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    const { data, meta } = await requestEnvelope<KitchenStaff[]>(
      `/kitchen/users?${qs.toString()}`,
    );
    const items = (data ?? []).map(normalizeStaff);
    return {
      items,
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", page_size),
      total: numberFromMeta(meta, "total", items.length),
    };
  },

  async createKitchenUser(
    body: CreateKitchenStaffInput,
  ): Promise<CreateKitchenStaffResult> {
    const data = await request<CreateKitchenStaffResult>("/kitchen/users", {
      method: "POST",
      body: JSON.stringify({
        email: body.email.trim(),
        full_name: optionalText(body.full_name),
      }),
    });
    return {
      ...data,
      user_id: String(data.user_id),
      kitchen_id: String(data.kitchen_id),
    };
  },

  async listKitchenWarehouses(): Promise<KitchenWarehouse[]> {
    // Not paginated: no meta, and `data` is every warehouse in the restaurant.
    const data = await request<KitchenWarehouse[]>("/kitchen/warehouses");
    return (data ?? []).map((warehouse) => ({
      ...warehouse,
      id: String(warehouse.id),
      restaurant_id: String(warehouse.restaurant_id),
    }));
  },

  async createKitchenWarehouseRequest(
    body: CreateKitchenWarehouseRequestInput,
  ): Promise<KitchenRequest> {
    const data = await request<KitchenRequest>("/kitchen/requests/warehouse", {
      method: "POST",
      body: JSON.stringify({
        warehouse_id: body.warehouse_id,
        notes: optionalText(body.notes),
        lines: body.lines.map((line) => ({
          product_id: line.product_id,
          quantity_requested: line.quantity_requested,
        })),
      }),
    });
    return normalizeKitchenRequest(data);
  },

  async listKitchenWarehouseRequests(
    filters?: KitchenRequestFilters,
  ): Promise<Paginated<KitchenRequest>> {
    return fetchRequestList("/kitchen/requests/warehouse", filters);
  },

  async listKitchenBranchRequests(
    filters?: KitchenRequestFilters,
  ): Promise<Paginated<KitchenRequest>> {
    return fetchRequestList("/kitchen/requests/branch", filters);
  },

  async getKitchenRequest(requestId: string): Promise<KitchenRequest> {
    const data = await request<KitchenRequest>(`/kitchen/requests/${requestId}`);
    return normalizeKitchenRequest(data);
  },

  async updateKitchenRequestStatus(
    requestId: string,
    body: UpdateKitchenRequestStatusInput,
  ): Promise<KitchenRequest> {
    const data = await request<KitchenRequest>(
      `/kitchen/requests/${requestId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          to_status: body.to_status,
          notes: optionalText(body.notes),
        }),
      },
    );
    return normalizeKitchenRequest(data);
  },
};
