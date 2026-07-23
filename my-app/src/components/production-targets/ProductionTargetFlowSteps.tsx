"use client";

import { Check } from "lucide-react";
import {
  PRODUCTION_TARGET_FLOW,
  PRODUCTION_TARGET_STEP_LABEL,
  productionTargetStep,
} from "@/lib/production-targets/lifecycle";
import type { ProductionTargetStatus } from "@/lib/types/production-target";
import { cn } from "@/lib/utils";

/**
 * The seven-stage lifecycle as a horizontal stepper. Read-only — it shows where
 * a target is, not how to move it. Both portals render it so the flow reads the
 * same to Admin, the Kitchen, and (via the detail) anyone reviewing it.
 */
export function ProductionTargetFlowSteps({
  status,
}: {
  status: ProductionTargetStatus;
}) {
  const current = productionTargetStep(status);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {PRODUCTION_TARGET_FLOW.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tabular-nums transition",
                  done && "border-brand bg-brand text-brand-contrast",
                  active && "border-brand bg-brand/10 text-brand",
                  !done && !active && "border-line bg-surface-2 text-faint",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  active ? "text-content" : done ? "text-muted" : "text-faint",
                )}
              >
                {PRODUCTION_TARGET_STEP_LABEL[step]}
              </span>
            </div>
            {i < PRODUCTION_TARGET_FLOW.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "hidden h-px w-6 sm:block",
                  i < current ? "bg-brand" : "bg-line",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
