"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS: { label: string; href: string }[] = [
  { label: "Board", href: "/branch/sub-kitchen" },
  { label: "Stock", href: "/branch/sub-kitchen/stock" },
  { label: "Recipes", href: "/branch/sub-kitchen/recipes" },
  { label: "Waste", href: "/branch/sub-kitchen/waste" },
  { label: "Sold out", href: "/branch/sub-kitchen/sold-out" },
  { label: "Overview", href: "/branch/sub-kitchen/overview" },
];

/** Board is the index, so it's active only on an exact match; the rest by prefix. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/branch/sub-kitchen") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SubKitchenTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
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
