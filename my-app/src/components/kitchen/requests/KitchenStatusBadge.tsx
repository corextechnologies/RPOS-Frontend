"use client";

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import type {
  KitchenRequestStatus,
  KitchenRequestType,
} from "@/lib/types/kitchen";
import { titleCase } from "@/lib/utils";

/**
 * Kitchen-local on purpose: this vocabulary spans both request types the portal
 * sees, so it includes DISPATCHED (warehouse side) and the production statuses
 * Admin never drives. It cannot share Admin's or the Warehouse's badge map.
 */
const STATUS_VARIANT: Record<
  KitchenRequestStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  PARTIALLY_APPROVED: "secondary",
  FORWARDED_TO_KITCHEN: "warning",
  DISPATCHED: "secondary",
  IN_PRODUCTION: "secondary",
  PRODUCED: "secondary",
  ALLOCATED: "success",
  RECEIVED: "success",
};

export function formatKitchenRequestType(type: KitchenRequestType): string {
  return type === "KITCHEN_TO_WAREHOUSE" ? "Warehouse request" : "Branch request";
}

export function formatKitchenStatus(status: string): string {
  return status
    .split("_")
    .map((part) => titleCase(part.toLowerCase()))
    .join(" ");
}

export function KitchenStatusBadge({ status }: { status: KitchenRequestStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
      {formatKitchenStatus(status)}
    </Badge>
  );
}
