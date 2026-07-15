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
  | "overview:read"
  // Warehouse (Phase 3)
  | "inventory:read"
  | "stock:receive"
  | "stock:adjust"
  | "stock:waste"
  | "staff:read"
  | "staff:create"
  | "po:read"
  | "po:create";

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
    "overview:read",
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
  ],
  KITCHEN_MANAGER: [],
  BRANCH_MANAGER: [],
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
