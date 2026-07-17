"use client";

import { useEffect, useState } from "react";
import { CloudOff, CloudUpload, Check, TriangleAlert } from "lucide-react";
import { onOutboxChange, outboxStats, type OutboxStats } from "@/lib/pos/outbox";
import { drainOutbox } from "@/lib/pos/sync";
import { cn } from "@/lib/utils";

/**
 * "N orders pending sync", with the age of the oldest.
 *
 * The age is the number that matters. "3 pending" is fine; "3 pending, oldest
 * 4 hours" means something is wrong and a manager needs to know before the
 * cashier goes home and the terminal is switched off with sales still on it.
 */
function ageLabel(oldestAt: number | null): string | null {
  if (!oldestAt) return null;
  const mins = Math.floor((Date.now() - oldestAt) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`;
}

export function SyncIndicator() {
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void outboxStats()
        .then((s) => alive && setStats(s))
        .catch(() => {
          /* IndexedDB unavailable — the indicator is not worth a crash. */
        });
    };
    refresh();
    const unsub = onOutboxChange(refresh);
    const timer = window.setInterval(refresh, 15_000);
    return () => {
      alive = false;
      unsub();
      window.clearInterval(timer);
    };
  }, []);

  // Drain on reconnect. `navigator.onLine` is famously optimistic — it reports
  // "online" for a Wi-Fi network with no route to the internet — so it is used
  // only as a *hint to try*, never as proof. The real answer is whether the
  // POST succeeds.
  useEffect(() => {
    const up = () => {
      setOnline(true);
      void drainOutbox();
    };
    const down = () => setOnline(false);

    // Deferred a tick: `navigator` doesn't exist during SSR, so the initial
    // value can't be read at render time, and reading it synchronously here
    // would cascade a render.
    const sync = window.setTimeout(() => setOnline(navigator.onLine), 0);

    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const timer = window.setInterval(() => void drainOutbox(), 30_000);
    return () => {
      window.clearTimeout(sync);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.clearInterval(timer);
    };
  }, []);

  const pending = stats?.pending ?? 0;
  const flagged = stats?.flagged ?? 0;

  if (!pending && !flagged && online) {
    return (
      <span className="hidden items-center gap-1.5 px-2 text-xs text-positive sm:flex">
        <Check className="size-3.5" aria-hidden />
        Synced
      </span>
    );
  }

  const age = ageLabel(stats?.oldestAt ?? null);

  return (
    <button
      type="button"
      onClick={() => {
        setBusy(true);
        void drainOutbox().finally(() => setBusy(false));
      }}
      className={cn(
        "flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition",
        !online
          ? "bg-warning/15 text-warning"
          : flagged
            ? "bg-danger/10 text-danger"
            : "bg-surface-2 text-muted hover:text-content",
      )}
      aria-label={
        pending ? `${pending} orders pending sync${age ? `, oldest ${age}` : ""}` : "Sync now"
      }
    >
      {!online ? (
        <CloudOff className="size-3.5" aria-hidden />
      ) : flagged ? (
        <TriangleAlert className="size-3.5" aria-hidden />
      ) : (
        <CloudUpload className={cn("size-3.5", busy && "animate-pulse")} aria-hidden />
      )}
      {pending > 0 && (
        <span>
          {pending}
          {age && <span className="text-faint"> · {age}</span>}
        </span>
      )}
      {!pending && !online && <span>Offline</span>}
      {!pending && flagged > 0 && <span>{flagged} flagged</span>}
    </button>
  );
}
