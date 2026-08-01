"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SubKitchenTab {
  label: string;
  href: string;
  /** The index tab matches exactly; every other tab matches by prefix. */
  index?: boolean;
}

/**
 * The tab bar over a sub-kitchen surface. Presentational on purpose: the portal
 * and the Branch portal's read-only tab show different tabs, and passing the
 * list in keeps the *which* out of here — so the read-only view cannot grow an
 * operate tab by someone editing a shared array.
 */
export function SubKitchenTabs({ tabs }: { tabs: SubKitchenTab[] }) {
  const pathname = usePathname();

  const isActive = (tab: SubKitchenTab) =>
    tab.index
      ? pathname === tab.href
      : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = isActive(tab);
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
