"use client";

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/types/admin";
import { titleCase } from "@/lib/utils";

const STATUS_VARIANT: Record<RequestStatus, NonNullable<BadgeProps["variant"]>> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  PARTIALLY_APPROVED: "secondary",
  FORWARDED_TO_KITCHEN: "secondary",
  DISPATCHED: "secondary",
  // A reported problem is waiting on Admin, so it reads as needing attention.
  REPORTED: "warning",
  RESOLVED: "secondary",
  IN_PRODUCTION: "secondary",
  PRODUCED: "secondary",
  ALLOCATED: "secondary",
  RECEIVED: "success",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {formatStatus(status)}
    </Badge>
  );
}

/**
 * Tolerates a missing value: these render one cell, and an unexpected payload
 * should not take down the whole table with it.
 */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return "-";
  return status
    .split("_")
    .map((part) => titleCase(part.toLowerCase()))
    .join(" ");
}

export function formatRequestType(type: string | null | undefined): string {
  if (!type) return "-";
  if (type === "BRANCH_TO_ADMIN") return "Product request";
  if (type === "WAREHOUSE_TO_ADMIN_PO") return "Distribution / PO";
  if (type === "KITCHEN_TO_WAREHOUSE") return "Kitchen request";
  if (type === "KITCHEN_TO_ADMIN") return "Dispatch request";
  return formatStatus(type);
}
