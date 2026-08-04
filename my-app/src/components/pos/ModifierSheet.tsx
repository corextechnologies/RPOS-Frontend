"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatMinor, sumMinor } from "@/lib/money";
import { usePosCurrency } from "@/lib/pos/pos-session";
import { validateModifiers } from "@/lib/pos/cart";
import { cn } from "@/lib/utils";
import type { ResolvedMenuItem } from "@/lib/hooks/use-pos-menu";

/**
 * Modifier picker.
 *
 * The min/max rules are checked here so "choose a sauce" is a disabled Add
 * button rather than a 409 in front of a queue. The server checks the same
 * rules independently and is the authority — this is convenience, and it says
 * so in `validateModifiers`.
 */
export function ModifierSheet({
  item,
  open,
  onOpenChange,
  onAdd,
}: {
  item: ResolvedMenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: ResolvedMenuItem, optionIds: number[], note?: string, needsPrep?: boolean) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [needsPrep, setNeedsPrep] = useState(false);
  const { currency, minorUnits } = usePosCurrency();

  // Memoised because `item?.modifier_groups ?? []` allocates a fresh array on
  // every render, which would make the useMemos below recompute every time and
  // achieve precisely nothing.
  const groups = useMemo(() => item?.modifier_groups ?? [], [item]);
  const validation = useMemo(() => validateModifiers(groups, selected), [groups, selected]);

  const deltaMinor = useMemo(() => {
    const options = groups.flatMap((g) => g.options).filter((o) => selected.includes(o.id));
    return sumMinor(options.map((o) => o.price_delta_minor));
  }, [groups, selected]);

  if (!item) return null;

  function toggle(groupId: number, optionId: number, maxSelect: number) {
    setSelected((prev) => {
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);

      // A single-select group behaves like a radio: picking replaces rather
      // than accumulating, which is what a cashier expects from "choose one".
      if (maxSelect === 1) {
        const group = groups.find((g) => g.id === groupId);
        const siblings = group?.options.map((o) => o.id) ?? [];
        return [...prev.filter((id) => !siblings.includes(id)), optionId];
      }
      return [...prev, optionId];
    });
  }

  function reset() {
    setSelected([]);
    setNote("");
    setNeedsPrep(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>

        {item.is_combo && item.components.length > 0 && (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            Combo of {item.components.length} item
            {item.components.length === 1 ? "" : "s"}.
          </p>
        )}

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <Label className="text-sm font-medium">{group.name}</Label>
                <span
                  className={cn(
                    "text-xs",
                    validation.errors[group.id] ? "text-danger" : "text-faint",
                  )}
                >
                  {validation.errors[group.id] ??
                    (group.min_select > 0 ? "Required" : "Optional")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {group.options.map((option) => {
                  const on = selected.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(group.id, option.id, group.max_select)}
                      className={cn(
                        "flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                        on
                          ? "border-brand bg-brand/10 text-content"
                          : "border-line bg-surface text-muted hover:border-brand/50",
                      )}
                    >
                      <span className="min-w-0 truncate">{option.name}</span>
                      {option.price_delta_minor !== 0 && (
                        <span className="shrink-0 text-xs tabular-nums text-faint">
                          {option.price_delta_minor > 0 ? "+" : ""}
                          {formatMinor(option.price_delta_minor, currency, minorUnits)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              placeholder={needsPrep ? "Happy Birthday Ali, no onions…" : "no ice, extra crispy…"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Needs final prep — flags the line so sending drops a job on the
              branch sub-kitchen board, carrying the note as the instruction. */}
          <label
            htmlFor="needs-prep"
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-content">Needs final prep</span>
              <span className="block text-xs text-muted">
                Sends this line to the sub-kitchen board with the note.
              </span>
            </span>
            <Switch id="needs-prep" checked={needsPrep} onCheckedChange={setNeedsPrep} />
          </label>
        </div>

        <DialogFooter>
          <Button
            className="h-12 w-full text-base"
            disabled={!validation.ok}
            onClick={() => {
              onAdd(item, selected, note.trim() || undefined, needsPrep);
              reset();
              onOpenChange(false);
            }}
          >
            Add · {formatMinor(item.price_minor + deltaMinor, currency, minorUnits)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
