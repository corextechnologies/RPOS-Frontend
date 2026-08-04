import type {
  BillingOut,
  BillingSummary,
  CreateRestaurantInput,
  CreateRestaurantResult,
  Invoice,
  InvoiceOut,
  PlanStatus,
  PlanTier,
  Restaurant,
  RestaurantOut,
  RestaurantCreateResult,
  UpdateAdminRestaurantInput,
  UpdateRestaurantInput,
} from "@/lib/types/super-admin";

function statusToPlanStatus(status: RestaurantOut["status"]): PlanStatus {
  return status === "ACTIVE" ? "active" : "halted";
}

export function invoiceFromApi(inv: InvoiceOut): Invoice {
  return {
    id: String(inv.id),
    amount: inv.amount,
    issued_on: inv.issued_on,
    paid: inv.paid,
    restaurant_id: String(inv.restaurant_id),
    restaurant_name: inv.restaurant_name,
    owner_contact_email: inv.owner_contact_email,
  };
}

export function restaurantFromApi(r: RestaurantOut): Restaurant {
  return {
    id: String(r.id),
    name: r.name,
    plan_tier: (r.plan_tier ?? "standard") as PlanTier,
    plan_status: statusToPlanStatus(r.status),
    branch_limit: r.branch_limit ?? 0,
    branch_count: 0,
    // Unknown (backend not yet emitting the field) means the tenant keeps its
    // central kitchen — preserves today's behavior against the live API.
    has_central_kitchen: r.has_central_kitchen ?? true,
    plan_amount: r.plan_amount,
    next_billing_date: r.next_billing_date,
    admin: {
      name: r.admin_full_name ?? "",
      email: r.owner_contact_email ?? "",
      phone: r.owner_contact_number ?? "",
      access_status: "active",
    },
    address: r.address ?? null,
    logo_url: r.logo_url ?? null,
    public_slug: r.public_slug ?? null,
    production_mode: r.production_mode,
    production_guidance: r.production_guidance,
  };
}

export function createInputToApi(body: CreateRestaurantInput) {
  return {
    name: body.name,
    owner_contact_email: body.owner_email,
    owner_contact_number: body.owner_phone || undefined,
    admin_full_name: body.owner_name || undefined,
    branch_limit: body.branch_limit,
    plan_tier: body.plan_tier,
    plan_amount: body.plan_amount,
    has_central_kitchen: body.has_central_kitchen ?? true,
    // Backend ignores next_billing_date on create and sets today + 1 month when a plan is set.
    // Always include payment_received as a real boolean (never omit / never string/"1").
    payment_received: body.payment_received === true,
  };
}

export function updateInputToApi(body: UpdateRestaurantInput) {
  const patch: Record<string, unknown> = {};
  if (body.owner_email !== undefined) patch.owner_contact_email = body.owner_email;
  if (body.owner_phone !== undefined) patch.owner_contact_number = body.owner_phone;
  if (body.plan_tier !== undefined) patch.plan_tier = body.plan_tier;
  if (body.plan_amount !== undefined) patch.plan_amount = body.plan_amount;
  if (body.branch_limit !== undefined) patch.branch_limit = body.branch_limit;
  if (body.next_billing_date !== undefined) patch.next_billing_date = body.next_billing_date;
  if (body.has_central_kitchen !== undefined) patch.has_central_kitchen = body.has_central_kitchen;
  return patch;
}

/**
 * Profile-only patch for the Admin's own restaurant. Maps the app's field names
 * to the backend's `owner_contact_*` / `admin_full_name` wire shape. Never emits
 * plan/billing keys — those are Super-Admin-only by contract.
 */
export function adminRestaurantUpdateToApi(body: UpdateAdminRestaurantInput) {
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.owner_name !== undefined) patch.admin_full_name = body.owner_name;
  if (body.owner_email !== undefined) patch.owner_contact_email = body.owner_email;
  if (body.owner_phone !== undefined) patch.owner_contact_number = body.owner_phone;
  if (body.address !== undefined) patch.address = body.address;
  if (body.logo_url !== undefined) patch.logo_url = body.logo_url;
  return patch;
}

export function createResultFromApi(result: RestaurantCreateResult): CreateRestaurantResult {
  return {
    restaurant: restaurantFromApi(result.restaurant),
    admin_email: result.admin_email,
    admin_user_id: result.admin_user_id,
    credential_email_sent: result.credential_email_sent,
  };
}

export function billingFromApi(b: BillingOut, restaurant?: Restaurant): BillingSummary {
  return {
    restaurant_id: String(b.restaurant_id),
    restaurant_name: b.restaurant_name ?? restaurant?.name ?? "",
    owner_contact_email:
      b.owner_contact_email ?? restaurant?.admin.email ?? null,
    plan_tier: (b.plan_tier ?? restaurant?.plan_tier ?? "standard") as PlanTier,
    plan_status: restaurant?.plan_status ?? "active",
    plan_amount: b.plan_amount ?? restaurant?.plan_amount ?? null,
    next_billing_date: b.next_billing_date,
    invoices: (b.invoices ?? []).map(invoiceFromApi),
  };
}
