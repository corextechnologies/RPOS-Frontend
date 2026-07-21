"use client";

import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { readPriceMismatch } from "@/lib/api/errors";
import type { ApiError } from "@/lib/types/super-admin";

/**
 * The 409 `price_mismatch` surface.
 *
 * This is why `ApiError` had to learn `details`: the server returns EVERY
 * mismatched line in one response, precisely so a stale device isn't
 * round-tripped once per line. Rendering that as a toast would throw away the
 * breakdown and the whole reason the contract is shaped this way.
 *
 * The action offered is "charge the new price", not "cancel". A price mismatch
 * is a menu that moved, not a mistake by the cashier, and the customer is
 * standing there. Confirming re-submits without the proposal and lets the
 * server price it.
 */
export function PriceMismatchDialog({
  error,
  open,
  onOpenChange,
  onAcceptServerPrice,
  busy,
  formatTotal,
}: {
  error: ApiError | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcceptServerPrice: () => void;
  busy?: boolean;
  /**
   * How to render a minor-unit total, when the server sends one.
   *
   * Passed in rather than read from POS context, because this dialog serves two
   * surfaces with different money: the till (minor units, inside the POS
   * provider) and the branch portal (decimal strings, outside it — where
   * `usePosCurrency` would throw). Branch simply omits this; its `details` carry
   * per-line strings and no minor total.
   */
  formatTotal?: (minor: number) => string;
}) {
  if (!error) return null;

  const details = readPriceMismatch(error);
  const showTotal = details.serverTotalMinor != null && formatTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prices have changed</DialogTitle>
          <DialogDescription>
            The menu moved since this cart was priced. These are the current prices.
          </DialogDescription>
        </DialogHeader>

        {details.lines.length > 0 && (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {details.lines.map((line, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-content">{line.label}</span>
                {line.proposed && (
                  <span className="tabular-nums text-faint line-through">{line.proposed}</span>
                )}
                <ArrowRight className="size-3.5 shrink-0 text-faint" aria-hidden />
                <span className="font-medium tabular-nums text-content">{line.server ?? "-"}</span>
              </li>
            ))}
          </ul>
        )}

        {showTotal && (
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <span className="text-sm text-muted">New total</span>
            <span className="font-display text-lg font-semibold tabular-nums text-content">
              {formatTotal(details.serverTotalMinor as number)}
            </span>
          </div>
        )}

        {/* Nothing parseable came back — never leave the user with a blank
            dialog; the server's own message is always better than silence. */}
        {details.lines.length === 0 && !showTotal && (
          <p className="text-sm text-muted">{error.message}</p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Back to cart
          </Button>
          <Button onClick={onAcceptServerPrice} disabled={busy}>
            Charge new price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
