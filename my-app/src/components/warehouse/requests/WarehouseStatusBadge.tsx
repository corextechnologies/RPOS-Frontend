"use client";

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import type { WarehouseRequestStatus } from "@/lib/types/warehouse";
import { titleCase } from "@/lib/utils";

/**
 * Warehouse-local on purpose: this vocabulary includes DISPATCHED and excludes
 * Admin-only statuses, so it cannot share Admin's badge map.
 */
const STATUS_VARIANT: Record<
  WarehouseRequestStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  PENDING: "warning",
  APPROVED: "success",
  PARTIALLY_APPROVED: "secondary",
  IN_QUEUE: "secondary",
  DISPATCHED: "secondary",
  RECEIVED: "success",
};

export function formatWarehouseStatus(status: string): string {
  return status
    .split("_")
    .map((part) => titleCase(part.toLowerCase()))
    .join(" ");
}

export function WarehouseStatusBadge({ status }: { status: WarehouseRequestStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {formatWarehouseStatus(status)}
    </Badge>
  );
}
