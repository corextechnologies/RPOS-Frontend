"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudOff, Globe, Loader2, LogOut, Receipt, Settings, Wallet, Utensils } from "lucide-react";
import { usePosBootstrap, usePosSession } from "@/lib/pos/pos-session";
import { POS_REGIONS, posSession } from "@/lib/pos/session";
import { packCountryCode } from "@/lib/pos/capabilities";
import { PosGate } from "./PosGate";
import { SyncIndicator } from "./SyncIndicator";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The till chrome.
 *
 * Deliberately not `ProtectedPortalLayout`/`PortalShell`: that shell assumes an
 * online `useAuth` bootstrap, a sidebar, and a desk. This one is tablet-first,
 * survives with no network, and has a footprint measured against a queue of
 * customers. The PDF's own note on this screen — "keep it lean" — is the brief.
 */
export function PosShell({ children }: { children: React.ReactNode }) {
  const { bootstrap, loading } = usePosSession();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Starting terminal" />
      </div>
    );
  }

  if (!bootstrap) return <PosGate />;

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}

const TABS = [
  { href: "/pos/sell", label: "Sell", icon: Utensils },
  { href: "/pos/orders", label: "Orders", icon: Receipt },
  { href: "/pos/shift", label: "Shift", icon: Wallet },
  { href: "/pos/settings", label: "Settings", icon: Settings },
];

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const bootstrap = usePosBootstrap();
  const { signOut, stale } = usePosSession();
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-content">
              {bootstrap.branch.code}
              <span className="text-faint"> · </span>
              {bootstrap.device.code}
            </p>
            <p className="truncate text-xs text-muted">
              {bootstrap.user.position
                ? bootstrap.user.position.toLowerCase().replace(/_/g, " ")
                : bootstrap.user.role.toLowerCase().replace(/_/g, " ")}
              {bootstrap.device.profile === "CURBSIDE" && " · curbside"}
            </p>
          </div>

          <nav className="ml-auto flex gap-1">
            {TABS.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    // 44px min touch target — this is used with a thumb.
                    "flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition",
                    active
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-surface-2 hover:text-content",
                  )}
                >
                  <tab.icon className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          <SyncIndicator />

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>

        {stale && (
          <div className="flex items-center gap-2 bg-warning/10 px-4 py-1.5 text-xs text-warning">
            <CloudOff className="size-3.5" aria-hidden />
            Working offline — menu and prices are from the last sync.
          </div>
        )}

        <RegionMismatchNotice />
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

/**
 * The operator picked a region on sign-in; the branch bills under whatever its
 * record says. When they disagree, **the branch wins and we say so** — the pick
 * was never a tax decision, and quietly ignoring it would leave someone
 * convinced they'd changed something.
 */
function RegionMismatchNotice() {
  const bootstrap = usePosBootstrap();
  const billsUnder = packCountryCode(bootstrap);
  const picked = posSession.region;

  if (!picked || picked === billsUnder) return null;

  const pickedLabel = POS_REGIONS.find((r) => r.code === picked)?.label ?? picked;

  return (
    <div className="flex items-center gap-2 bg-accent/10 px-4 py-1.5 text-xs text-accent">
      <Globe className="size-3.5 shrink-0" aria-hidden />
      You chose {pickedLabel}, but this branch ({bootstrap.branch.code}) bills under{" "}
      {billsUnder}. Its rules apply.
    </div>
  );
}
