import type { Paginated } from "@/lib/types/admin";
import type {
  CreateDispatchNotificationInput,
  CreateKitchenCountInput,
  CreateKitchenStaffInput,
  CreateKitchenStaffResult,
  CreateKitchenWarehouseRequestInput,
  UpdateKitchenStaffInput,
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
import type {
  CreateKitchenProductInput,
  CreateKitchenRecipeInput,
  KitchenCatalogueItem,
  KitchenProduceInput,
  KitchenRecipe,
} from "@/lib/types/kitchen";
import type { ProductionRun } from "@/lib/types/branch";
import type { KitchenPlanningResponse } from "@/lib/types/forecast";
import type {
  KitchenProductionTargetFilters,
  ProductionTarget,
} from "@/lib/types/production-target";
import type { WasteEvent, WasteEventFilters } from "@/lib/types/waste";
import { request, requestEnvelope, requestUpload } from "./client";
import { staffProfileBody } from "./staff-body";
import { apiConfig } from "./config";
import { normalizeProductionTarget } from "./admin.api";
import { idOrNull, numberFromMeta, optionalText } from "./normalize";

function normalizeInventoryItem(item: KitchenInventoryItem): KitchenInventoryItem {
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
    full_name: staff.full_name ?? null,
    job_title: staff.job_title ?? null,
    phone_number: staff.phone_number ?? null,
    address: staff.address ?? null,
    image_url: staff.image_url ?? null,
    cnic_front_url: staff.cnic_front_url ?? null,
    cnic_back_url: staff.cnic_back_url ?? null,
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
      // New per-line production tracking on branch requests; coerce to a plain
      // boolean so the UI never has to test for undefined.
      produced: Boolean(line.produced),
    })),
    // Dispatch requests carry the per-branch split; normalize its integer ids to
    // the app's string convention. Undefined for other request types.
    allocations: req.allocations?.map((a) => ({
      ...a,
      id: String(a.id),
      line_item_id: String(a.line_item_id),
      product_id: a.product_id != null ? String(a.product_id) : a.product_id,
      branch_id: String(a.branch_id),
      quantity: Number(a.quantity),
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

  async listKitchenWarehouseInventory(
    warehouseId: string,
  ): Promise<KitchenInventoryItem[]> {
    // What a warehouse holds, so the kitchen can judge availability before
    // requesting. Quantity only — procurement cost stays Admin-only, so these
    // rows reuse the kitchen's cost-free product shape.
    const data = await request<KitchenInventoryItem[]>(
      `/kitchen/warehouses/${warehouseId}/inventory`,
    );
    return (data ?? []).map(normalizeInventoryItem);
  },

  async wasteKitchenStock(body: KitchenWasteInput): Promise<KitchenInventoryItem[]> {
    // The server returns the list of stock lots the write-off touched — a single
    // request can span more than one lot (a finished good with no batch code may
    // sit in several lots that differ only by expiry, cleared soonest-first).
    const data = await request<KitchenInventoryItem[]>("/kitchen/stock/waste", {
      method: "POST",
      body: JSON.stringify({
        product_id: body.product_id,
        quantity: body.quantity,
        // Required here, unlike the Warehouse's waste endpoint.
        waste_reason: body.waste_reason,
        movement_type: body.movement_type,
        batch_code: optionalText(body.batch_code),
        // Optional: when present, the server targets that exact expiry lot
        // instead of clearing soonest-first. Dropped when blank.
        expiry_date: optionalText(body.expiry_date),
        notes: optionalText(body.notes),
      }),
    });
    return (data ?? []).map(normalizeInventoryItem);
  },

  async listKitchenWasteEvents(
    filters?: WasteEventFilters,
  ): Promise<WasteEvent[]> {
    const qs = filters?.movement_type
      ? `?movement_type=${filters.movement_type}`
      : "";
    const data = await request<WasteEvent[]>(`/kitchen/stock/waste${qs}`);
    return (data ?? []).map((event) => ({
      ...event,
      id: String(event.id),
      product_id: String(event.product_id),
      product: { ...event.product, id: String(event.product.id) },
      quantity: Number(event.quantity),
      batch_code: event.batch_code ?? "",
      location_id: String(event.location_id),
    }));
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
        ...staffProfileBody(body),
        email: body.email.trim(),
        job_title: body.job_title?.trim() ?? "",
      }),
    });
    return {
      ...data,
      user_id: String(data.user_id),
      kitchen_id: String(data.kitchen_id),
    };
  },

  async deleteKitchenUser(id: string): Promise<void> {
    await request<{ detail: string }>(`/kitchen/users/${id}`, { method: "DELETE" });
  },

  async updateKitchenUser(id: string, body: UpdateKitchenStaffInput): Promise<KitchenStaff> {
    const data = await request<KitchenStaff>(`/kitchen/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return normalizeStaff(data);
  },

  // Absolute-izes a relative upload URL against the API origin so the <img>
  // works wherever the app is served. Mirrors `uploadEmployeeImage`, but hits
  // the kitchen-specific route (the ADMIN one 403s for a kitchen manager).
  async uploadKitchenStaffImage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const data = await requestUpload<{ url: string }>(
      "/kitchen/upload/staff-image",
      form,
    );
    const url = data.url;
    if (url.startsWith("/")) {
      const origin = apiConfig.baseUrl.replace(/\/v1$/, "");
      return `${origin}${url}`;
    }
    return url;
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

  async createDispatchNotification(
    body: CreateDispatchNotificationInput,
  ): Promise<KitchenRequest> {
    const data = await request<KitchenRequest>("/kitchen/dispatch-notifications", {
      method: "POST",
      body: JSON.stringify({
        notes: optionalText(body.notes),
        lines: body.lines.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
        })),
      }),
    });
    return normalizeKitchenRequest(data);
  },

  async listKitchenDispatchRequests(
    filters?: KitchenRequestFilters,
  ): Promise<Paginated<KitchenRequest>> {
    return fetchRequestList("/kitchen/dispatch-notifications", filters);
  },

  async dispatchKitchenRequest(requestId: string): Promise<KitchenRequest> {
    const data = await request<KitchenRequest>(
      `/kitchen/dispatch-notifications/${requestId}/dispatch`,
      { method: "POST" },
    );
    return normalizeKitchenRequest(data);
  },

  async getKitchenRequest(requestId: string): Promise<KitchenRequest> {
    const data = await request<KitchenRequest>(`/kitchen/requests/${requestId}`);
    return normalizeKitchenRequest(data);
  },

  async markKitchenRequestLineProduced(
    requestId: string,
    lineId: string,
  ): Promise<KitchenRequest> {
    const data = await request<KitchenRequest>(
      `/kitchen/requests/${requestId}/lines/${lineId}/produced`,
      { method: "POST" },
    );
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

  // ---- Finished goods, recipes & production (Phase: product kinds) ----
  //
  // Recipes moved here from `/v1/pos/recipes` (Admin-owned), which is now
  // removed. The move is the point, not a refactor: a recipe describes what the
  // KITCHEN does with the components the kitchen holds. Under Admin it had no
  // catalogue to attach to.

  async listKitchenCatalogue(): Promise<KitchenCatalogueItem[]> {
    const data = await request<KitchenCatalogueItem[]>("/kitchen/products");
    return (data ?? []).map((p) => ({ ...p, id: String(p.id), sku: p.sku ?? null }));
  },

  /** Takes no `kind` — everything here is a FINISHED_GOOD by construction. */
  async createKitchenProduct(body: CreateKitchenProductInput): Promise<KitchenCatalogueItem> {
    const data = await request<KitchenCatalogueItem>("/kitchen/products", {
      method: "POST",
      body: JSON.stringify({
        name: body.name.trim(),
        sku: optionalText(body.sku),
        // Always send when the form chose one (including EACH).
        ...(body.stock_unit !== undefined ? { stock_unit: body.stock_unit } : {}),
      }),
    });
    return { ...data, id: String(data.id), sku: data.sku ?? null };
  },

  async listKitchenRecipes(): Promise<KitchenRecipe[]> {
    const data = await request<KitchenRecipe[]>("/kitchen/recipes");
    return (data ?? []).map(normalizeRecipe);
  },

  async getKitchenRecipe(id: string): Promise<KitchenRecipe> {
    return normalizeRecipe(await request<KitchenRecipe>(`/kitchen/recipes/${id}`));
  },

  /**
   * Versioned, not edited. Posting the same `product_id` again supersedes the
   * previous recipe (v1 -> v2) and deactivates it — there is no PATCH, so this
   * is the only way to change one.
   */
  async createKitchenRecipe(body: CreateKitchenRecipeInput): Promise<KitchenRecipe> {
    return normalizeRecipe(
      await request<KitchenRecipe>("/kitchen/recipes", {
        method: "POST",
        body: JSON.stringify({
          product_id: body.product_id,
          yield_qty: body.yield_qty ?? 1,
          note: optionalText(body.note ?? undefined) ?? null,
          components: body.components.map((c) => ({
            component_product_id: c.component_product_id,
            quantity: c.quantity,
            unit: c.unit,
            wastage_bp: c.wastage_bp ?? 0,
          })),
        }),
      }),
    );
  },

  async listKitchenProduction(): Promise<ProductionRun[]> {
    const data = await request<ProductionRun[]>("/kitchen/production");
    return (data ?? []).map(normalizeRun);
  },

  async getKitchenProductionRun(id: string): Promise<ProductionRun> {
    return normalizeRun(await request<ProductionRun>(`/kitchen/production/${id}`));
  },

  /**
   * Actually make something. Consumes the recipe's components from kitchen
   * stock and credits the finished goods back to it — components first, so a
   * shortfall can never mint stock from nothing.
   */
  async produceKitchenProduct(
    body: KitchenProduceInput,
    idempotencyKey?: string,
  ): Promise<ProductionRun> {
    return normalizeRun(
      await request<ProductionRun>("/kitchen/production", {
        method: "POST",
        // When present, the server replays the original run on a retry instead
        // of producing (and crediting stock) again.
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
        body: JSON.stringify({
          product_id: body.product_id,
          quantity: body.quantity,
          batch_code: optionalText(body.batch_code ?? undefined) ?? null,
          expiry_date: optionalText(body.expiry_date ?? undefined) ?? null,
          note: optionalText(body.note ?? undefined) ?? null,
        }),
      }),
    );
  },

  // ---- Daily production targets (from Admin) ----
  //
  // Auto-scoped to the logged-in manager's kitchen server-side; there is no
  // kitchen filter here, only date.

  async listKitchenProductionTargets(
    filters?: KitchenProductionTargetFilters,
  ): Promise<ProductionTarget[]> {
    const qs = filters?.date
      ? `?${new URLSearchParams({ date: filters.date }).toString()}`
      : "";
    const data = await request<ProductionTarget[]>(`/kitchen/production-targets${qs}`);
    return (data ?? []).map(normalizeProductionTarget);
  },

  async getKitchenProductionTarget(id: string): Promise<ProductionTarget> {
    const data = await request<ProductionTarget>(`/kitchen/production-targets/${id}`);
    return normalizeProductionTarget(data);
  },

  /** PENDING → ACKNOWLEDGED. 409 `invalid_target_status` on any other state. */
  async acknowledgeProductionTarget(id: string): Promise<ProductionTarget> {
    const data = await request<ProductionTarget>(
      `/kitchen/production-targets/${id}/acknowledge`,
      { method: "POST" },
    );
    return normalizeProductionTarget(data);
  },

  /** ACKNOWLEDGED → IN_PRODUCTION. 409 `invalid_target_status` otherwise. */
  async startProductionTarget(id: string): Promise<ProductionTarget> {
    const data = await request<ProductionTarget>(
      `/kitchen/production-targets/${id}/start`,
      { method: "POST" },
    );
    return normalizeProductionTarget(data);
  },

  /** Mark one line ready (made, or resale set aside). Only while IN_PRODUCTION. */
  async markProductionTargetLineProduced(
    id: string,
    lineId: string,
  ): Promise<ProductionTarget> {
    const data = await request<ProductionTarget>(
      `/kitchen/production-targets/${id}/lines/${lineId}/produced`,
      { method: "POST" },
    );
    return normalizeProductionTarget(data);
  },

  /** IN_PRODUCTION → COMPLETED. Every line must be ready. Notifies Admin. */
  async completeProductionTarget(id: string): Promise<ProductionTarget> {
    const data = await request<ProductionTarget>(
      `/kitchen/production-targets/${id}/complete`,
      { method: "POST" },
    );
    return normalizeProductionTarget(data);
  },

  /** ALLOCATED → DISPATCHED. Ships the allocated quantities to the branches. */
  async dispatchProductionTarget(id: string): Promise<ProductionTarget> {
    const data = await request<ProductionTarget>(
      `/kitchen/production-targets/${id}/dispatch`,
      { method: "POST" },
    );
    return normalizeProductionTarget(data);
  },

  // ---- Phase 7 production plan (read-only, §8) ----
  //
  // Confirmed plans only, summed across branches — a central kitchen makes one
  // batch for the chain. `ready: false` with empty targets when there is
  // nothing. There is no write route; this is purely a read. The whole kitchen
  // router is 403 for a kitchen-off tenant, so the nav item is feature-gated.

  async kitchenPlanning(days = 7): Promise<KitchenPlanningResponse> {
    return request<KitchenPlanningResponse>(
      `/kitchen/planning?${new URLSearchParams({ days: String(days) })}`,
    );
  },
};

function normalizeRecipe(r: KitchenRecipe): KitchenRecipe {
  return {
    ...r,
    id: String(r.id),
    components: (r.components ?? []).map((c) => ({
      ...c,
      quantity: Number(c.quantity),
      wastage_bp: Number(c.wastage_bp ?? 0),
    })),
  };
}

function normalizeRun(r: ProductionRun): ProductionRun {
  return {
    ...r,
    id: String(r.id),
    location_id: String(r.location_id),
    recipe_id: r.recipe_id == null ? null : String(r.recipe_id),
    lines: (r.lines ?? []).map((l) => ({
      ...l,
      id: String(l.id),
      product_id: String(l.product_id),
      quantity: Number(l.quantity),
    })),
  };
}
