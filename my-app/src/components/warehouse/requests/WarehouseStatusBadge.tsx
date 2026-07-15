"use client";

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import type {
  WarehouseRequestStatus,
  WarehouseRequestType,
} from "@/lib/types/warehouse";
import { titleCase } from "@/lib/utils";

/**
 * Warehouse-local on purpose: this vocabulary includes REPORTED and excludes
 * Admin-only statuses, so it cannot share Admin's badge map.
 *
 * The colour is type-agnostic by necessity — DISPATCHED means "act on this" for
 * a PO and "waiting on the kitchen" for a kitchen request. Anything that needs
 * to distinguish those must branch on `request_type`, not on the badge.
 */
const STATUS_VARIANT: Record<
  WarehouseRequestStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  PENDING: "warning",
  APPROVED: "success",
  PARTIALLY_APPROVED: "secondary",
  DISPATCHED: "secondary",
  REPORTED: "warning",
  RESOLVED: "secondary",
  RECEIVED: "success",
};

export function formatWarehouseRequestType(type: WarehouseRequestType): string {
  return type === "WAREHOUSE_TO_ADMIN_PO" ? "Purchase order" : "Kitchen request";
}

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
