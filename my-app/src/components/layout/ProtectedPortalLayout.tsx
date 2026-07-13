"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES, postAuthPath, requiresPasswordChange } from "@/lib/auth/actions";
import { isRoleAllowed } from "@/lib/auth/roles";
import { PortalLoadingScreen, PortalShell } from "@/components/layout/PortalShell";
import type { UserRole } from "@/lib/types/super-admin";

interface ProtectedPortalLayoutProps {
  role: UserRole;
  children: React.ReactNode;
}

export function ProtectedPortalLayout({ role, children }: ProtectedPortalLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(AUTH_ROUTES.login);
      return;
    }
    if (requiresPasswordChange(user)) {
      router.replace(AUTH_ROUTES.changePassword);
      return;
    }
    if (!isRoleAllowed(user.role, role)) {
      router.replace(postAuthPath(user));
    }
  }, [user, loading, role, router]);

  if (loading || !user || requiresPasswordChange(user) || !isRoleAllowed(user.role, role)) {
    return <PortalLoadingScreen />;
  }

  return <PortalShell role={role}>{children}</PortalShell>;
}
