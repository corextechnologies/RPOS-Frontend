"use client";

import { useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ label: string; hours: number | null }> = [
  { label: "Rest of shift", hours: null },
  { label: "1 hour", hours: 1 },
  { label: "Until tomorrow", hours: 12 },
];

export interface EightySixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human label for the item — a product name, or "Item #4" when unnamed. */
  title: string;
  isAvailable: boolean;
  /** The current 86 reason, shown when the item is already off the menu. */
  currentReason?: string | null;
  isPending: boolean;
  /**
   * `available` is the target state: `true` puts it back, `false` 86s it.
   * `reason` is trimmed (empty when none), `autoClearAt` is ISO or null.
   */
  onSubmit: (available: boolean, reason: string, autoClearAt: string | null) => void;
}

/**
 * Take a menu item off (86) or put it back. Presentational only — the caller
 * owns the mutation, so the same dialog drives both the POS availability list
 * and the sub-kitchen sold-out screen, each hitting its own endpoint.
 */
export function EightySixDialog({
  open,
  onOpenChange,
  title,
  isAvailable,
  currentReason,
  isPending,
  onSubmit,
}: EightySixDialogProps) {
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState<number | null>(null);

  // Clear the form each time the dialog closes so the next item starts fresh.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setReason("");
      setHours(null);
    }
  }

  function submit(available: boolean) {
    // Without an auto-clear, every 86 is permanent until a human remembers —
    // and nobody remembers.
    const autoClearAt =
      available || hours === null ? null : new Date(Date.now() + hours * 3600_000).toISOString();
    onSubmit(available, reason.trim(), autoClearAt);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isAvailable
              ? "Take this off the menu. Staff still see it, greyed out."
              : (currentReason ?? "Currently off the menu.")}
          </DialogDescription>
        </DialogHeader>

        {isAvailable ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="86-reason">Reason</Label>
              <Input
                id="86-reason"
                autoFocus
                placeholder="Fryer down"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-faint">Shown to staff on the tile.</p>
            </div>

            <div className="space-y-2">
              <Label>Bring it back</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setHours(p.hours)}
                    className={cn(
                      "h-10 rounded-xl border text-xs font-medium transition",
                      hours === p.hours
                        ? "border-brand bg-brand/10 text-content"
                        : "border-line bg-surface text-muted hover:border-brand/50",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={isPending} onClick={() => submit(false)}>
                <Ban className="mr-1.5 size-4" aria-hidden />
                86 it
              </Button>
            </DialogFooter>
          </>
        ) : (
          <Button className="h-11 w-full" disabled={isPending} onClick={() => submit(true)}>
            <RotateCcw className="mr-2 size-4" aria-hidden />
            Put it back on
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
