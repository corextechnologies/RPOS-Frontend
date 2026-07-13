import type { UserRole } from "@/lib/types/super-admin";

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

const ROLE_ACTIONS: Record<UserRole, AuthAction[]> = {
  super_admin: [
    "restaurants:read",
    "restaurants:create",
    "restaurants:update",
    "restaurants:delete",
    "plans:halt",
    "plans:activate",
    "admins:revoke",
    "admins:restore",
    "billing:read",
    "billing:share",
  ],
  restaurant_admin: [],
};

export function canPerform(role: UserRole | undefined, action: AuthAction): boolean {
  if (!role) return false;
  return ROLE_ACTIONS[role]?.includes(action) ?? false;
}

export function portalPathForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin/dashboard";
    case "restaurant_admin":
      return "/login";
    default:
      return "/login";
  }
}
