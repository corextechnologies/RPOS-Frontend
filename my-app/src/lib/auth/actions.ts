export type AuthAction =
  | "restaurants:read"
  | "restaurants:create"
  | "restaurants:update"
  | "restaurants:delete"
  | "plans:halt"
  | "plans:activate"
  | "admins:revoke"
  | "admins:restore"
  | "billing:read"
  | "billing:share"
  // Admin (Phase 2)
  | "branches:read"
  | "branches:create"
  | "kitchens:read"
  | "kitchens:create"
  | "warehouses:read"
  | "warehouses:create"
  | "employees:read"
  | "users:create"
  | "pricing:read"
  | "pricing:update"
  | "requests:read"
  | "requests:update"
  | "sales:read"
  | "sales:create"
  | "customers:read"
  | "production-targets:read"
  | "production-targets:create"
  | "production-targets:update"
  | "production-targets:delete"
  | "overview:read"
  // POS back-office (Admin). The till reads these and cannot change them.
  | "devices:read"
  | "devices:create"
  | "menu:read"
  | "menu:publish"
  | "discounts:read"
  | "discounts:create"
  | "recipes:read"
  | "recipes:create"
  // Warehouse (Phase 3)
  | "inventory:read"
  | "stock:receive"
  | "stock:adjust"
  | "stock:waste"
  | "staff:read"
  | "staff:create"
  | "po:read"
  | "po:create"
  | "kitchen-requests:read"
  // Kitchen (Phase 4). Namespaced away from the Warehouse's stock actions: the
  // two portals grant them to different roles against different endpoints.
  | "kitchen-inventory:read"
  | "kitchen-labels:read"
  | "kitchen-stock:waste"
  | "kitchen-counts:read"
  | "kitchen-counts:create"
  | "kitchen-staff:read"
  | "kitchen-staff:create"
  | "kitchen-warehouse-requests:read"
  | "kitchen-warehouse-requests:create"
  | "kitchen-branch-requests:read"
  | "kitchen-requests:update"
  // Daily production targets — set by Admin, read + progressed by the Kitchen
  // manager (acknowledge/complete). Manager-only: the endpoints require
  // KITCHEN_MANAGER, so a sub-chef never sees these.
  | "kitchen-production-targets:read"
  | "kitchen-production-targets:update"
  // Branch (Phase 5). Namespaced away from Kitchen/Warehouse for the same
  // reason those are namespaced from each other: different roles, different
  // endpoints, same English words.
  //
  // These gate on ROLE, not position — `/auth/me` returns role and nothing
  // finer, so the portal can only distinguish manager from staff. The POS is
  // the surface with position-grain authority, and it gates on the capability
  // list from `/pos/session/bootstrap` instead. Don't conflate the two.
  | "branch-orders:read"
  | "branch-orders:create"
  | "branch-customers:read"
  | "branch-customers:create"
  | "branch-customers:update"
  | "branch-customers:delete"
  | "branch-inventory:read"
  | "branch-waste:log"
  | "branch-production:read"
  | "branch-production:create"
  | "branch-requests:read"
  | "branch-requests:create"
  | "branch-planning:read"
  | "branch-sales:read"
  | "branch-staff:read"
  | "branch-staff:create";

import type { UserRole } from "@/lib/types/super-admin";

export { portalPathForRole, PORTAL_HOME, PORTAL_LABEL, PORTAL_PREFIX } from "./roles";
export { postAuthPath, requiresPasswordChange, AUTH_ROUTES } from "./routes";
export { roleFromAccessToken } from "./jwt";

const ROLE_ACTIONS: Record<UserRole, AuthAction[]> = {
  SUPER_ADMIN: [
    "restaurants:read",
    "restaurants:create",
    "restaurants:update",
    "plans:halt",
    "plans:activate",
    "billing:read",
  ],
  ADMIN: [
    "billing:read",
    "branches:read",
    "branches:create",
    "kitchens:read",
    "kitchens:create",
    "warehouses:read",
    "warehouses:create",
    "employees:read",
    "users:create",
    "pricing:read",
    "pricing:update",
    "requests:read",
    "requests:update",
    "sales:read",
    "sales:create",
    "customers:read",
    "production-targets:read",
    "production-targets:create",
    "production-targets:update",
    "production-targets:delete",
    "overview:read",
    "menu:read",
    "menu:publish",
    "discounts:read",
    "discounts:create",
    "recipes:read",
    "recipes:create",
  ],
  WAREHOUSE_MANAGER: [
    "inventory:read",
    "stock:receive",
    "stock:adjust",
    "stock:waste",
    "staff:read",
    "staff:create",
    "po:read",
    "po:create",
    "kitchen-requests:read",
    // Same operation name as Admin's, scoped by this role's own transition map.
    "requests:update",
  ],
  KITCHEN_MANAGER: [
    "kitchen-inventory:read",
    "kitchen-labels:read",
    "kitchen-stock:waste",
    "kitchen-counts:read",
    "kitchen-counts:create",
    "kitchen-staff:read",
    "kitchen-staff:create",
    "kitchen-warehouse-requests:read",
    "kitchen-warehouse-requests:create",
    "kitchen-branch-requests:read",
    "kitchen-requests:update",
    "kitchen-production-targets:read",
    "kitchen-production-targets:update",
  ],
  /**
   * Read-only, plus logging waste. No approvals, transitions, stock requests,
   * counts, or user creation — and note that stock counts are manager-only to
   * *read* as well, since a count is an inventory rewrite rather than a report.
   *
   * This mirrors the server, which enforces the same split independently and
   * answers 403. Treat what is hidden here as convenience, not security.
   */
  SUB_CHEF: [
    "kitchen-inventory:read",
    "kitchen-labels:read",
    "kitchen-stock:waste",
    "kitchen-warehouse-requests:read",
    "kitchen-branch-requests:read",
  ],
  BRANCH_MANAGER: [
    "branch-orders:read",
    "branch-orders:create",
    "branch-customers:read",
    "branch-customers:create",
    "branch-customers:update",
    "branch-customers:delete",
    "branch-inventory:read",
    "branch-waste:log",
    "branch-production:read",
    "branch-production:create",
    "branch-requests:read",
    "branch-requests:create",
    "branch-planning:read",
    "branch-sales:read",
    "branch-staff:read",
    "branch-staff:create",
    // A terminal belongs to a branch, and its manager is the one who registers
    // it — using their ordinary portal token, because no device token can exist
    // until the device does.
    "devices:read",
    "devices:create",
  ],
  /**
   * The counter staff profile. Takes orders and captures customers; cannot log
   * waste, run a sub-kitchen production run, or raise a stock request — those
   * are the manager's, and the server enforces it independently.
   *
   * Inventory is READ-able here on purpose: the Phase 5 delta opened
   * `GET /branch/inventory` to sub-staff specifically so a salesperson can see
   * what has run out. Waste stayed manager-only.
   *
   * Deleting a customer is withheld pending confirmation — the wiring guide
   * documents the soft-delete endpoint but not who may call it, so this errs
   * closed. If the server allows staff, widening this is a one-line change; the
   * reverse costs a customer record.
   */
  BRANCH_STAFF: [
    "branch-orders:read",
    "branch-orders:create",
    "branch-customers:read",
    "branch-customers:create",
    "branch-customers:update",
    "branch-inventory:read",
  ],
};

export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role === "SUPER_ADMIN";
}

export function canPerform(role: UserRole | undefined, action: AuthAction): boolean {
  if (!role) return false;
  return ROLE_ACTIONS[role]?.includes(action) ?? false;
}

export const MOCK_ONLY_ACTIONS: AuthAction[] = [
  "restaurants:delete",
  "admins:revoke",
  "admins:restore",
  "billing:share",
];
