"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON: Record<ToastKind, React.ComponentProps<typeof Icon>["name"]> = {
  success: "check-circle",
  error: "alert",
  info: "sparkle",
};

const ACCENT: Record<ToastKind, string> = {
  success: "text-positive",
  error: "text-danger",
  info: "text-brand",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const value: ToastContextValue = {
    push,
    success: (title, description) => push({ kind: "success", title, description }),
    error: (title, description) => push({ kind: "error", title, description }),
    info: (title, description) => push({ kind: "info", title, description }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,360px)] flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="glass pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5 shadow-lift"
            >
              <span className={cn("mt-0.5 shrink-0", ACCENT[t.kind])}>
                <Icon name={ICON[t.kind]} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-content">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 rounded-lg p-1 text-faint transition hover:bg-surface-2 hover:text-content"
                aria-label="Dismiss"
              >
                <Icon name="close" size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
