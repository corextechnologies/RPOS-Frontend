"use client";

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import type { ProductionTargetStatus } from "@/lib/types/production-target";
import { titleCase } from "@/lib/utils";

const STATUS_VARIANT: Record<
  ProductionTargetStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  // Waiting on the kitchen to pick it up.
  PENDING: "warning",
  // Seen and owned by the kitchen, not yet made.
  ACKNOWLEDGED: "secondary",
  // Made.
  COMPLETED: "success",
};

export function ProductionTargetStatusBadge({
  status,
}: {
  status: ProductionTargetStatus;
}) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {formatTargetStatus(status)}
    </Badge>
  );
}

/** Tolerates a missing value — one cell must never take down the table. */
export function formatTargetStatus(status: string | null | undefined): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((part) => titleCase(part.toLowerCase()))
    .join(" ");
}
