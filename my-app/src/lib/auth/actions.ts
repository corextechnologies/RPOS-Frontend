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
  | "billing:share";

import type { UserRole } from "@/lib/types/super-admin";

const ROLE_ACTIONS: Record<UserRole, AuthAction[]> = {
  SUPER_ADMIN: [
    "restaurants:read",
    "restaurants:create",
    "restaurants:update",
    "plans:halt",
    "plans:activate",
    "billing:read",
  ],
  ADMIN: [],
  WAREHOUSE_MANAGER: [],
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

export function portalPathForRole(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "ADMIN":
      return "/login";
    default:
      return "/login";
  }
}

export const MOCK_ONLY_ACTIONS: AuthAction[] = [
  "restaurants:delete",
  "admins:revoke",
  "admins:restore",
  "billing:share",
];
