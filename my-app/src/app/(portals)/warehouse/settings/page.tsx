"use client";

import { PortalLoadingScreen } from "@/components/layout/PortalShell";
import { PortalSettings } from "@/components/layout/PortalSettings";
import { useAuth } from "@/lib/auth";

export default function WarehouseSettingsPage() {
  // Follows the signed-in user: both warehouse roles share this portal.
  const { user } = useAuth();
  if (!user) return <PortalLoadingScreen />;
  return <PortalSettings role={user.role} />;
}
