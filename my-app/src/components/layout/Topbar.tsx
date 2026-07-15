"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Menu, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { initials } from "@/lib/utils";
import { displayName } from "@/lib/types/super-admin";
import { titleCase } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  restaurants: "Restaurants",
  new: "Add Restaurant",
  income: "Income",
  billing: "Billing",
  settings: "Settings",
};

interface TopbarProps {
  portalLabel: string;
  portalHome: string;
  onMenu: () => void;
}

function Breadcrumbs({ portalLabel, portalHome }: { portalLabel: string; portalHome: string }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean).slice(1);

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm text-faint sm:flex">
      <Link href={portalHome} className="hover:text-content">
        {portalLabel}
      </Link>
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={i === parts.length - 1 ? "font-medium text-content" : "hover:text-content"}>
            {SEGMENT_LABELS[part] ?? titleCase(part)}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function Topbar({ portalLabel, portalHome, onMenu }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <Breadcrumbs portalLabel={portalLabel} portalHome={portalHome} />
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                {user ? initials(displayName(user)) : "?"}
              </span>
              <span className="hidden text-sm font-medium sm:inline">{user ? displayName(user) : ""}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout();
                window.location.assign(AUTH_ROUTES.login);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
