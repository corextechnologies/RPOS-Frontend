"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV, SETTINGS_ITEM, visibleFor } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { Icon, Logomark } from "@/components/icons";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "focus-ring group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "text-brand" : "text-muted hover:bg-surface-2 hover:text-content",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl border border-brand/20 bg-brand/10"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-3">
        <Icon name={icon} size={19} />
        {label}
      </span>
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can, user } = useAuth();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-strong text-brand-contrast">
          <Logomark size={22} />
        </span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-tight text-content">ROS</p>
          <p className="text-[11px] text-faint">Main Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAV.map((section) => {
          const items = visibleFor(section, can);
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <NavLink
          href={SETTINGS_ITEM.href}
          icon={SETTINGS_ITEM.icon}
          label={SETTINGS_ITEM.label}
          active={isActive(SETTINGS_ITEM.href)}
          onNavigate={onNavigate}
        />
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-semibold text-brand">
            {user?.name?.slice(0, 2).toUpperCase() ?? "··"}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-content">{user?.name}</p>
            <p className="truncate text-[11px] text-faint">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
