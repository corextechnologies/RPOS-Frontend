import type {
  WarehouseRequestStatus,
  WarehouseRequestType,
} from "@/lib/types/warehouse";

/**
 * Status moves the WAREHOUSE may make. Deliberately narrower than the full
 * workflow — everything omitted here belongs to another portal:
 *
 * - Kitchen requests: the kitchen marks RECEIVED after we dispatch.
 * - Purchase orders: Admin drives PENDING → APPROVED/PARTIALLY_APPROVED →
 *   IN_QUEUE. The warehouse only closes them out at the end.
 *
 * Kept separate from the Admin map in `lib/admin/request-transitions.ts`: the
 * vocabularies differ (DISPATCHED here, REJECTED/FORWARDED_TO_KITCHEN there).
 */
export const WAREHOUSE_REQUEST_TRANSITIONS: Record<
  WarehouseRequestType,
  Partial<Record<WarehouseRequestStatus, readonly WarehouseRequestStatus[]>>
> = {
  KITCHEN_TO_WAREHOUSE: {
    PENDING: ["APPROVED"],
    APPROVED: ["DISPATCHED"],
  },
  WAREHOUSE_TO_ADMIN_PO: {
    IN_QUEUE: ["RECEIVED"],
  },
};

export function warehouseAllowedTransitions(
  type: WarehouseRequestType,
  status: WarehouseRequestStatus,
): WarehouseRequestStatus[] {
  return [...(WAREHOUSE_REQUEST_TRANSITIONS[type]?.[status] ?? [])];
}

export function warehouseActionLabel(toStatus: WarehouseRequestStatus): string {
  switch (toStatus) {
    case "APPROVED":
      return "Approve";
    case "DISPATCHED":
      return "Dispatch";
    case "RECEIVED":
      return "Mark received";
    default:
      return toStatus
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
  }
}

/** Consequences worth stating before the manager commits to the move. */
export function warehouseActionHint(
  type: WarehouseRequestType,
  toStatus: WarehouseRequestStatus,
): string | null {
  if (type === "KITCHEN_TO_WAREHOUSE" && toStatus === "DISPATCHED") {
    return "Dispatching removes these quantities from your on-hand stock. The kitchen confirms receipt on their side.";
  }
  if (type === "WAREHOUSE_TO_ADMIN_PO" && toStatus === "RECEIVED") {
    return "This closes the order only. Book the goods in separately through Receive stock.";
  }
  return null;
}
