"use client";

import { useState } from "react";
import { Loader2, TicketPercent } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ManagerApprovalDialog } from "./ManagerApprovalDialog";
import { useApplyDiscount, useDiscountRules } from "@/lib/hooks/use-pos-payments";
import { formatBasisPoints } from "@/lib/money";
import { isApiCode, POS_ERROR, posErrorMessage, readLimitBp } from "@/lib/api/errors";
import { usePosSession } from "@/lib/pos/pos-session";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PosOrder } from "@/lib/types/pos";

/**
 * Applying a discount.
 *
 * The interesting path is the 403. The server re-validates the rule against the
 * user's authority and answers `discount_needs_approval` with `details.limit_bp`
 * when they're over their ceiling — that is **not an error**, it's a prompt.
 * Toasting "forbidden" at a cashier doing exactly the right thing is how a POS
 * earns its reputation; instead a manager authorises and the same call retries.
 *
 * Note the server decides, not this dialog: nothing here checks the limit up
 * front. It couldn't — the limit is the server's, and a client that pre-empted
 * it would be a second rule to drift.
 */
export function DiscountDialog({
  order,
  open,
  onOpenChange,
  onApplied,
}: {
  order: PosOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: (order: PosOrder) => void;
}) {
  const { data: rules, isLoading } = useDiscountRules();
  const applyDiscount = useApplyDiscount();
  const { can } = usePosSession();
  // The server decides — this only sets expectations. Someone without
  // DISCOUNT_OVER_LIMIT will hit a 403 on a big discount, and being told that
  // up front beats being surprised by it with a customer waiting.
  const mayExceedLimit = can("DISCOUNT_OVER_LIMIT");

  const [selected, setSelected] = useState<string | null>(null);
  const [approvalFor, setApprovalFor] = useState<string | null>(null);
  const [limitBp, setLimitBp] = useState<number | null>(null);

  if (!order) return null;

  async function apply(code: string) {
    if (!order) return;
    try {
      const updated = await applyDiscount.mutateAsync({ orderId: order.id, input: { code } });
      onApplied(updated);
      toast.success("Discount applied");
      onOpenChange(false);
      setApprovalFor(null);
    } catch (err) {
      if (isApiCode(err, POS_ERROR.DISCOUNT_NEEDS_APPROVAL)) {
        setLimitBp(readLimitBp(err));
        setApprovalFor(code);
        return;
      }
      toast.error(posErrorMessage(err));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply a discount</DialogTitle>
            <DialogDescription>{order.order_no}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading" />
            </div>
          ) : !rules?.length ? (
            <div className="py-8 text-center">
              <TicketPercent className="mx-auto size-7 text-faint" aria-hidden />
              <p className="mt-2 text-sm text-muted">No discount rules set up.</p>
              <p className="text-xs text-faint">An admin defines these.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rules
                .filter((r) => r.is_active !== false)
                .map((rule) => (
                  <li key={rule.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(rule.code)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition",
                        selected === rule.code
                          ? "border-brand bg-brand/10"
                          : "border-line bg-surface hover:border-brand/50",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-content">{rule.name}</p>
                        <p className="font-mono text-xs text-faint">{rule.code}</p>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-muted">
                        {/* value_bp is basis points: 5000 = 50%. */}
                        {rule.type === "PCT" ? formatBasisPoints(rule.value_bp) : "Fixed"}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}

          {!mayExceedLimit && !!rules?.length && (
            <p className="text-xs text-faint">
              Anything above your limit will ask for a manager&apos;s PIN.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selected || applyDiscount.isPending}
              onClick={() => selected && void apply(selected)}
            >
              {applyDiscount.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              )}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManagerApprovalDialog
        open={approvalFor !== null}
        onOpenChange={(next) => !next && setApprovalFor(null)}
        title="Discount needs approval"
        description={
          limitBp != null
            ? `This is over the ${formatBasisPoints(limitBp)} you can approve on your own.`
            : "This discount is above your limit."
        }
        onApproved={async () => {
          if (approvalFor) await apply(approvalFor);
        }}
      />
    </>
  );
}
