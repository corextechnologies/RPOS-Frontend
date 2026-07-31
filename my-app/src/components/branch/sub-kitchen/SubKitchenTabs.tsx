"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Capability } from "@/lib/types/pos";

type TabVisible = (isManager: boolean, has: (cap: Capability) => boolean) => boolean;

/** Readable with prep access; the full manager always sees everything. */
const prepRead: TabVisible = (isManager, has) => isManager || has("PREP_READ");

/**
 * Tabs a Chef sees are a subset of the manager's: a Chef holds PREP_READ (board,
 * stock, recipes, overview) but not WASTE_LOG, and 86-ing is a manager-only menu
 * job — so Waste and Sold out are hidden for a Chef.
 */
const TABS: { label: string; href: string; show: TabVisible }[] = [
  { label: "Board", href: "/branch/sub-kitchen", show: prepRead },
  { label: "Stock", href: "/branch/sub-kitchen/stock", show: prepRead },
  { label: "Recipes", href: "/branch/sub-kitchen/recipes", show: prepRead },
  { label: "Waste", href: "/branch/sub-kitchen/waste", show: (m, has) => m || has("WASTE_LOG") },
  { label: "Sold out", href: "/branch/sub-kitchen/sold-out", show: (m) => m },
  { label: "Overview", href: "/branch/sub-kitchen/overview", show: prepRead },
];

/** Board is the index, so it's active only on an exact match; the rest by prefix. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/branch/sub-kitchen") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SubKitchenTabs() {
  const pathname = usePathname();
  const { can, hasCapability } = useAuth();
  const isManager = can("sub-kitchen:read");
  const tabs = TABS.filter((tab) => tab.show(isManager, hasCapability));

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand text-content"
                : "border-transparent text-muted hover:text-content",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
