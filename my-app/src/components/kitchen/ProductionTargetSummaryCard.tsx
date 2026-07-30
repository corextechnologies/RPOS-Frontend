"use client";

import Link from "next/link";
import { ChevronRight, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import type { ProductionTarget } from "@/lib/types/production-target";

/**
 * A read-only target row for the Production date browser — anything not currently
 * IN_PRODUCTION (pending, completed, dispatched…). It shows the date, status, and
 * product count and links through to the target's detail page, where the
 * stage-appropriate actions already live. In-production targets use the workable
 * `ProductionTargetProduceCard` instead.
 */
export function ProductionTargetSummaryCard({ target }: { target: ProductionTarget }) {
  const count = target.lines.length;

  return (
    <Card>
      <CardContent className="p-0">
        <Link
          href={`/kitchen/production-targets/${target.id}`}
          className="flex items-center justify-between gap-3 p-4"
        >
          <span className="flex items-center gap-2.5">
            <Target className="size-4 text-brand" aria-hidden />
            <span className="font-medium text-content">Production target</span>
            <span className="text-sm text-muted">{target.target_date}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-muted tabular-nums">
              {count} {count === 1 ? "product" : "products"}
            </span>
            <ProductionTargetStatusBadge status={target.status} />
            <ChevronRight className="size-4 text-faint" aria-hidden />
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
