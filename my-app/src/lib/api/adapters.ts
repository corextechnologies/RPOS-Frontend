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
    plan_amount: r.plan_amount,
    next_billing_date: r.next_billing_date,
    admin: {
      name: "",
      email: r.owner_contact_email ?? "",
      phone: r.owner_contact_number ?? "",
      access_status: "active",
    },
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
