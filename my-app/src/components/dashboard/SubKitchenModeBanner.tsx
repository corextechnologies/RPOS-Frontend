"use client";

import { AlertTriangle } from "lucide-react";
import type { ProductionMode } from "@/lib/types/super-admin";
import { cn } from "@/lib/utils";

/**
 * Shown on the Admin and Branch dashboards when a restaurant has no central
 * kitchen. `has_central_kitchen: false` alone doesn't tell an operator WHERE
 * finished goods are supposed to come from instead — this makes the branch
 * sub-kitchen prep board (recipes + prep tickets) discoverable instead of
 * being an implication a manager has to already know.
 */
export function SubKitchenModeBanner({
  productionMode,
  guidance,
  className,
}: {
  productionMode: ProductionMode;
  guidance: string;
  className?: string;
}) {
  if (productionMode !== "branch_sub_kitchen") return null;

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
        <p className="font-medium text-content">No central kitchen — branch produces locally</p>
        <p className="mt-0.5 text-muted">{guidance}</p>
      </div>
    </div>
  );
}
