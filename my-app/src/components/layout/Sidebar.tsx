"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logomark } from "@/components/icons";
import { isNavActive, visibleNavItems } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { NavItem, NavSection } from "@/lib/nav";

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-content",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

interface SidebarProps {
  sections: NavSection[];
  portalLabel: string;
  onNavigate?: () => void;
}

export function Sidebar({ sections, portalLabel, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-5">
        <Logomark size={28} className="text-brand" />
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold text-content">Restaurant OS</p>
          <p className="text-xs text-faint">{portalLabel}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {sections.map((section) => {
          const items = visibleNavItems(section.items, can);
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="space-y-1">
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {section.title}
              </p>
              {items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
