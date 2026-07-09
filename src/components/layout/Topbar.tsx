"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Icon } from "@/components/icons";
import { USE_MOCK } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/utils";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const doLogout = async () => {
    await logout();
    toast.info("Signed out");
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onMenu}
        className="focus-ring grid h-9 w-9 place-items-center rounded-xl border border-line text-muted lg:hidden"
        aria-label="Open menu"
      >
        <Icon name="menu" size={18} />
      </button>

      <div className="relative hidden max-w-sm flex-1 items-center sm:flex">
        <span className="pointer-events-none absolute left-3 text-faint">
          <Icon name="search" size={16} />
        </span>
        <input
          placeholder="Search branches, users, settings…"
          className="input-base h-9 border-transparent bg-surface-2 pl-9 text-[13px]"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        {USE_MOCK && (
          <Badge tone="warning" dot className="hidden md:inline-flex">
            Demo data
          </Badge>
        )}

        <button
          className="focus-ring relative grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition hover:text-content"
          aria-label="Notifications"
        >
          <Icon name="bell" size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-bg" />
        </button>

        <ThemeToggle />

        <div ref={ref} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="focus-ring flex items-center gap-2 rounded-xl border border-line py-1 pl-1 pr-2 transition hover:bg-surface-2"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-strong text-[11px] font-semibold text-brand-contrast">
              {user ? initials(user.name) : "··"}
            </span>
            <Icon name="chevronDown" size={15} className="text-faint" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="glass absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl p-1.5 shadow-lift"
              >
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-content">{user?.name}</p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                  <div className="mt-2">
                    <Badge tone="brand">{user?.role}</Badge>
                  </div>
                </div>
                <div className="my-1 h-px bg-line" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-content"
                >
                  <Icon name="settings" size={16} /> Settings
                </button>
                <button
                  onClick={doLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
                >
                  <Icon name="logout" size={16} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
