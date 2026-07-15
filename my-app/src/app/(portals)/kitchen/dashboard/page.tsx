"use client";

import { PortalDashboard } from "@/components/layout/PortalDashboard";
import { PortalLoadingScreen } from "@/components/layout/PortalShell";
import { useAuth } from "@/lib/auth";

export default function KitchenDashboardPage() {
  // Two roles share this portal, so the copy follows the signed-in user rather
  // than being hardcoded — a sub-chef should not be told they own the queue.
  const { user } = useAuth();
  if (!user) return <PortalLoadingScreen />;
  return <PortalDashboard role={user.role} />;
}
