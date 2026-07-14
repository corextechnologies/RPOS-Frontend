"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { Icon } from "@/components/icons";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, mounted, toggle } = useTheme();
  // Until mounted, render the server default (light) so the first client paint
  // matches the SSR HTML — the inline script has already set the real theme
  // class on <html>, and we reconcile the icon on the next frame.
  const effectiveTheme = mounted ? theme : "light";
  const isDark = effectiveTheme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`focus-ring relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2 text-content transition hover:text-brand ${className ?? ""}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={effectiveTheme}
          initial={{ y: 14, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -14, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.25 }}
          className="absolute"
        >
          <Icon name={isDark ? "moon" : "sun"} size={18} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
