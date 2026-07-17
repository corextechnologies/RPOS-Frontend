"use client";

import { useState } from "react";
import { Ban, Layers } from "lucide-react";
import { formatMinor } from "@/lib/money";
import { usePosCurrency } from "@/lib/pos/pos-session";
import { cn } from "@/lib/utils";
import type { ResolvedMenuItem } from "@/lib/hooks/use-pos-menu";

/**
 * The menu grid.
 *
 * Unavailable items are GREYED, never hidden. "We've run out of that" is
 * information the customer wants and the cashier needs — hiding the tile makes
 * the cashier hunt for an item that isn't there and then tell the customer
 * something vague. The `reason` comes straight from the server and, for a
 * combo, names the component that ran out.
 */
export function MenuGrid({
  items,
  categories,
  onPick,
}: {
  items: ResolvedMenuItem[];
  categories: string[];
  onPick: (item: ResolvedMenuItem) => void;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const { currency, minorUnits } = usePosCurrency();

  const shown = category ? items.filter((i) => i.category === category) : items;

  return (
    <div className="flex h-full flex-col">
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!item.available}
            onClick={() => onPick(item)}
            title={!item.available && item.reason ? item.reason : undefined}
            className={cn(
              "flex min-h-24 flex-col items-start gap-1 rounded-xl border p-3 text-left transition select-none",
              item.available
                ? "border-line bg-surface hover:border-brand hover:shadow-soft active:scale-[0.98]"
                : "cursor-not-allowed border-line/60 bg-surface-2 opacity-60",
            )}
          >
            <div className="flex w-full items-start gap-1.5">
              <span className="min-w-0 flex-1 text-sm font-medium text-content">{item.name}</span>
              {item.is_combo && (
                <Layers className="mt-0.5 size-3.5 shrink-0 text-accent" aria-label="Combo" />
              )}
            </div>

            <span className="font-display text-sm tabular-nums text-muted">
              {formatMinor(item.price_minor, currency, minorUnits)}
            </span>

            {!item.available && (
              <span className="mt-auto flex items-center gap-1 text-xs text-danger">
                <Ban className="size-3" aria-hidden />
                <span className="truncate">{item.reason ?? "Unavailable"}</span>
              </span>
            )}
          </button>
        ))}

        {shown.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-muted">
            Nothing on the menu here yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition",
        active ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-content",
      )}
    >
      {children}
    </button>
  );
}
