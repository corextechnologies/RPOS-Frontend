"use client";

import { AlertTriangle } from "lucide-react";
import { usePosBootstrap } from "@/lib/pos/pos-session";
import { cn } from "@/lib/utils";

/**
 * Shown wherever a tax total is displayed while the active pack is a stub.
 *
 * Deliberately **not dismissable**. Pakistan's restaurant sales tax is
 * provincial (PRA/SRB/KPRA/BRA) and several provinces rate card differently
 * from cash; the backend ships `pk@stub-0pct` at 0% rather than invent a
 * number, because a wrong rate looks finished, passes every test, and
 * misreports revenue to a provincial authority. A banner the cashier can close
 * is a banner that is closed once and never seen again — which is precisely the
 * failure this guards against.
 *
 * The corresponding hard rule lives in `ReceiptView`: no customer-facing
 * receipt may claim a tax total while `pack.is_stub` is true.
 */
export function StubTaxBanner({ className }: { className?: string }) {
  const { pack } = usePosBootstrap();
  if (!pack.is_stub) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="text-sm">
        <p className="font-medium text-content">Tax rules pending configuration</p>
        <p className="mt-0.5 text-muted">
          This branch is running the placeholder pack{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">{pack.version}</code> at 0%.
          Totals shown are not final tax figures and must not be given to a customer as a tax
          receipt.
        </p>
      </div>
    </div>
  );
}

/** True when tax figures on this terminal are placeholders, not law. */
export function useTaxIsStub(): boolean {
  return usePosBootstrap().pack.is_stub;
}
