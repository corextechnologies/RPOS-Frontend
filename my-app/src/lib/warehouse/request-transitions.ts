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
 *   DISPATCHED, and owns RESOLVED. The warehouse confirms or reports.
 *
 * Keying by request type is load-bearing, not decorative: DISPATCHED belongs to
 * BOTH vocabularies and means opposite directions. On a PO it means Admin sent
 * goods to us and we must act; on a kitchen request it means we already shipped
 * and the kitchen must act — hence the empty entry, which reads as "nothing to
 * do" rather than being absent by oversight.
 *
 * Kept separate from the Admin map in `lib/admin/request-transitions.ts`: the
 * vocabularies differ (REPORTED here, REJECTED/FORWARDED_TO_KITCHEN there).
 */
export const WAREHOUSE_REQUEST_TRANSITIONS: Record<
  WarehouseRequestType,
  Partial<Record<WarehouseRequestStatus, readonly WarehouseRequestStatus[]>>
> = {
  KITCHEN_TO_WAREHOUSE: {
    PENDING: ["APPROVED"],
    APPROVED: ["DISPATCHED"],
    // DISPATCHED is the kitchen's cue, not ours. Listed to make the ambiguity
    // explicit at the one place a reader would otherwise get it wrong.
    DISPATCHED: [],
  },
  WAREHOUSE_TO_ADMIN_PO: {
    // Admin sent the goods: confirm what arrived, or report a problem.
    DISPATCHED: ["RECEIVED", "REPORTED"],
    // Admin accepted the shortfall, so book in what actually turned up.
    RESOLVED: ["RECEIVED"],
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
    case "REPORTED":
      return "Report a problem";
    case "RECEIVED":
      return "Received";
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
  fromStatus?: WarehouseRequestStatus,
): string | null {
  if (type === "KITCHEN_TO_WAREHOUSE" && toStatus === "DISPATCHED") {
    return "Dispatching removes these quantities from your on-hand stock. The kitchen confirms receipt on their side.";
  }
  if (type === "WAREHOUSE_TO_ADMIN_PO" && toStatus === "RECEIVED") {
    // This used to close the order only, with intake booked separately. Since
    // Phase 4.1 it is the single moment PO stock enters the ledger.
    return fromStatus === "RESOLVED"
      ? "Books in what actually arrived and closes the order. Stock is credited once."
      : "Confirms the total received against this order and adds it to your stock. This is the only moment the order's stock is booked in.";
  }
  if (type === "WAREHOUSE_TO_ADMIN_PO" && toStatus === "REPORTED") {
    return "Tells Admin what is short or damaged. No stock is booked in — you confirm receipt once Admin responds.";
  }
  return null;
}

/**
 * Whether this move must carry `line_receipts`.
 *
 * Only POs receive or report; a kitchen request's RECEIVED is a plain status
 * move, which is exactly the confusion the type discriminator prevents.
 */
export function warehouseTransitionNeedsReceipts(
  type: WarehouseRequestType,
  toStatus: WarehouseRequestStatus,
): boolean {
  if (type !== "WAREHOUSE_TO_ADMIN_PO") return false;
  return toStatus === "RECEIVED" || toStatus === "REPORTED";
}
