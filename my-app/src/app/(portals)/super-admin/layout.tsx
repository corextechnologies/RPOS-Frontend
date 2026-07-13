"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logomark } from "@/components/icons";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "super_admin") router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-brand">
        <Logomark size={40} className="animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface/40 lg:block">
        <Sidebar />
      </aside>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
