"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTag } from "@/components/calendar/EventMultipliersField";
import {
  useProductEventTags,
  useProductExpectedDailySales,
  usePutExpectedDailySales,
  usePutProductEventTags,
} from "@/lib/hooks/use-calendar";
import { cn } from "@/lib/utils";
import { PRODUCT_EVENT_TAGS, type EventTag } from "@/lib/types/forecast";

/** "40" and "40.000" are the same value — normalise before the dirty-check (§3b). */
function normalizeNum(value: string | null | undefined): string {
  if (value == null) return "";
  const t = value.trim();
  if (t === "") return "";
  const n = Number(t);
  return Number.isNaN(n) ? t : String(n);
}

/**
 * Phase 7 forecast setup for one product (§3a event tags, §3b expected daily
 * sales). Sellable products only. Tags and expected-daily are separate
 * endpoints, so each saves on its own. The tag PUT REPLACES the whole set.
 */
export function ProductForecastDialog({
  product,
  open,
  onOpenChange,
}: {
  product: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const productId = product ? Number(product.id) : null;

  const tagsQuery = useProductEventTags(open ? productId : null);
  const expectedQuery = useProductExpectedDailySales(open ? productId : null);
  const putTags = usePutProductEventTags(productId ?? 0);
  const putExpected = usePutExpectedDailySales(productId ?? 0);

  const [selected, setSelected] = useState<EventTag[]>([]);
  const [expected, setExpected] = useState("");

  // Seed local state from the server whenever the dialog opens or the data lands.
  useEffect(() => {
    if (open && tagsQuery.data) setSelected(tagsQuery.data.tags);
  }, [open, tagsQuery.data]);
  useEffect(() => {
    if (open && expectedQuery.data) {
      setExpected(expectedQuery.data.expected_daily_units ?? "");
    }
  }, [open, expectedQuery.data]);

  const toggle = (tag: EventTag) =>
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const storedTags = tagsQuery.data?.tags ?? [];
  const tagsDirty =
    storedTags.length !== selected.length ||
    selected.some((t) => !storedTags.includes(t));

  const expectedDirty =
    normalizeNum(expected) !== normalizeNum(expectedQuery.data?.expected_daily_units);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product?.name} — forecast setup</DialogTitle>
          <DialogDescription>
            How this product responds to events, and its day-one estimate before it has
            sales history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event tags (§3a) */}
          <div className="space-y-2">
            <Label>Event tags</Label>
            <p className="text-sm text-muted">
              Which event categories lift this product. Keep these even after it has
              history — a dish added in January has no data from last Ramadan.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_EVENT_TAGS.map((tag) => {
                const on = selected.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      on
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-line text-muted hover:border-brand/40",
                    )}
                  >
                    {formatTag(tag)}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => putTags.mutate(selected)}
                disabled={!tagsDirty || putTags.isPending}
              >
                {putTags.isPending ? "Saving…" : "Save tags"}
              </Button>
            </div>
          </div>

          {/* Expected daily sales (§3b) */}
          <div className="space-y-2 border-t border-line pt-4">
            <Label htmlFor="expected">Expected daily sales</Label>
            <p className="text-sm text-muted">
              A rough day-one guess for a product with no history. Real sales take over
              within about four weeks — nobody maintains this.
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="expected"
                type="number"
                min={0}
                step="0.001"
                inputMode="decimal"
                className="w-40 tabular-nums"
                placeholder="e.g. 40"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
              <span className="text-sm text-muted">units / day</span>
              <div className="ml-auto flex gap-2">
                {expectedQuery.data?.expected_daily_units != null && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => putExpected.mutate(null)}
                    disabled={putExpected.isPending}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => putExpected.mutate(expected.trim() === "" ? null : expected.trim())}
                  disabled={!expectedDirty || putExpected.isPending}
                >
                  {putExpected.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
