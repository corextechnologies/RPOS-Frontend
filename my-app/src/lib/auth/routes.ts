import type { MeResponse } from "@/lib/types/super-admin";
import { portalPathForRole, SUB_KITCHEN_HOME } from "./roles";
import { isBranchChef } from "./capabilities";

export const AUTH_ROUTES = {
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  changePassword: "/change-password",
} as const;

export function requiresPasswordChange(user: MeResponse | null | undefined): boolean {
  return Boolean(user?.must_change_password);
}

export function postAuthPath(user: MeResponse): string {
  if (requiresPasswordChange(user)) return AUTH_ROUTES.changePassword;
  // A CHEF is BRANCH_STAFF by role but belongs in the sub-kitchen, not `/pos`.
  if (isBranchChef(user)) return SUB_KITCHEN_HOME;
  return portalPathForRole(user.role);
}

export function isAuthRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTES.login ||
    pathname === AUTH_ROUTES.forgotPassword ||
    pathname.startsWith(AUTH_ROUTES.resetPassword) ||
    pathname === AUTH_ROUTES.changePassword
  );
}
