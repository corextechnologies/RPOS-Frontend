"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCloseDay } from "@/lib/hooks/use-branch";
import type { BranchSalesRollup } from "@/lib/types/branch";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Render the counted window as "4–5 Aug" (or spanning months/years).
 *
 * `from`/`to` are date-only strings (`YYYY-MM-DD`); we split the parts rather
 * than `new Date(...)` so a timezone west of UTC can't roll the day backwards.
 */
function countedRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (!fy || !ty || !fm || !tm) return `${from} – ${to}`;
  const fMon = MONTHS[fm - 1];
  const tMon = MONTHS[tm - 1];
  if (fy === ty && fm === tm) return `${fd}–${td} ${tMon}`;
  if (fy === ty) return `${fd} ${fMon} – ${td} ${tMon}`;
  return `${fd} ${fMon} ${fy} – ${td} ${tMon} ${ty}`;
}

/**
 * The "Day closed" action for the Branch Manager dashboard.
 *
 * Presses `POST /branch/sales/rollup` to total the day's sales for the forecast
 * immediately, instead of waiting for the 5:30am job. It locks nothing and is
 * safe to run any number of times — so there's no disabling after a press and no
 * destructive styling. The result dialog names the window it counted (`from`..
 * `to`) rather than a bare "Success" toast, per the brief.
 */
export function CloseDayButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<BranchSalesRollup | null>(null);
  const closeDay = useCloseDay();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        <CalendarCheck className="mr-1.5 size-4" aria-hidden />
        Day closed
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Close the day?"
        description="Totals today's sales for the forecast now, instead of waiting for the overnight run. It doesn't lock the till or seal anything, and running it again later is harmless."
        confirmLabel="Count the day"
        loading={closeDay.isPending}
        onConfirm={() =>
          closeDay.mutate(undefined, {
            onSuccess: (data) => {
              setConfirmOpen(false);
              setResult(data);
            },
          })
        }
      />

      <Dialog open={result !== null} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Day counted</DialogTitle>
            <DialogDescription>
              {result &&
                `Counted ${countedRange(result.from, result.to)} — ${result.rows_written.toLocaleString()} ${
                  result.rows_written === 1 ? "row" : "rows"
                } recalculated for the forecast.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
