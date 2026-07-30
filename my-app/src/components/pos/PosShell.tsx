"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  CloudOff,
  Globe,
  Loader2,
  LogOut,
  Receipt,
  RefreshCw,
  Settings,
  Wallet,
  Utensils,
} from "lucide-react";
import { usePosBootstrap, usePosSession } from "@/lib/pos/pos-session";
import { usePosSync, type PosSyncState } from "@/lib/hooks/use-pos-sync";
import { POS_REGIONS, POS_ROUTES, posSession } from "@/lib/pos/session";
import { packCountryCode } from "@/lib/pos/capabilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/lib/auth/actions";
import { StubTaxBanner } from "@/components/pos/StubTaxBanner";
import type { PosBootstrapUser } from "@/lib/types/pos";

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
  const router = useRouter();

  useEffect(() => {
    if (loading || bootstrap) return;
    // No session: an unpaired device goes to activation; a paired one that just
    // needs a cashier goes to sign-in.
    router.replace(posSession.paired ? AUTH_ROUTES.login : POS_ROUTES.activate);
  }, [bootstrap, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Starting terminal" />
      </div>
    );
  }

  if (!bootstrap) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Redirecting to login" />
      </div>
    );
  }

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
  const { signOut } = usePosSession();
  const pathname = usePathname();
  const operator = displayUser(bootstrap.user);
  // Mounted once, here, for the whole till — usePosSync owns the drain triggers,
  // so a second instance would double them. The header badge and the offline
  // strip both read this one state.
  const sync = usePosSync();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-content">
              Logged in as {operator}
            </p>
            <p className="truncate text-xs text-muted">
              {bootstrap.branch.code}
              <span className="text-faint"> · </span>
              {bootstrap.device.code}
              <span className="text-faint"> · </span>
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

          <SyncIndicator sync={sync} />

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

        <StubTaxBanner className="mx-4 mb-2" />
        {sync.offline && <OfflineStrip queued={sync.queued} />}
        <RegionMismatchNotice />
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function displayUser(user: PosBootstrapUser): string {
  return user.full_name || user.name || user.email || `User #${user.id}`;
}

/**
 * The header sync affordance — presentational; the state is owned by the one
 * `usePosSync` in the shell. Shows a spinner while draining, the backlog count
 * when the queue is non-empty, and an offline mark when the browser reports no
 * connection. A tap forces a drain. Nothing here blocks selling; it is status,
 * not a gate.
 */
function SyncIndicator({ sync }: { sync: PosSyncState }) {
  const { queued, syncing, offline, drain } = sync;

  // Nothing to say when online, idle, and empty — keep the header quiet.
  if (!offline && !syncing && queued === 0) return null;

  const label = syncing ? "Syncing…" : offline ? "Offline" : `${queued} queued`;
  const Icon = offline && !syncing ? CloudOff : RefreshCw;

  return (
    <button
      type="button"
      onClick={() => void drain()}
      disabled={syncing}
      title={queued > 0 ? `${queued} action(s) waiting to sync` : "Sync status"}
      className={cn(
        "flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-medium transition",
        offline
          ? "bg-warning/10 text-warning"
          : queued > 0
            ? "bg-accent/10 text-accent"
            : "text-muted",
      )}
    >
      <Icon className={cn("size-4", syncing && "animate-spin")} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * A full-width strip so there is no doubt the till is offline. Sitting alongside
 * the stub-tax and region banners keeps the "something to know" copy in one
 * place. It reassures rather than warns: offline selling is a supported mode
 * here, and the sale is already safe on the device.
 */
function OfflineStrip({ queued }: { queued: number }) {
  return (
    <div className="flex items-center gap-2 bg-warning/10 px-4 py-1.5 text-xs text-warning">
      <CloudOff className="size-3.5 shrink-0" aria-hidden />
      Working offline — sales are saved on this device and sync automatically.
      {queued > 0 && <span className="font-medium">{queued} waiting.</span>}
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
