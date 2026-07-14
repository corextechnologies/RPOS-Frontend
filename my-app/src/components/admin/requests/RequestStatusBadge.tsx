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
  IN_QUEUE: "secondary",
  IN_PRODUCTION: "secondary",
  RECEIVED: "success",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {formatStatus(status)}
    </Badge>
  );
}

export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((part) => titleCase(part.toLowerCase()))
    .join(" ");
}

export function formatRequestType(type: string): string {
  if (type === "BRANCH_TO_ADMIN") return "Product request";
  if (type === "WAREHOUSE_TO_ADMIN_PO") return "Distribution / PO";
  return formatStatus(type);
}
