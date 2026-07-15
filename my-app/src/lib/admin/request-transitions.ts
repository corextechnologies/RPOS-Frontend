import type {
  AdminRequestType,
  RequestStatus,
} from "@/lib/types/admin";

/**
 * Status moves ADMIN may make, keyed by request type first.
 *
 * Keying by type is what keeps DISPATCHED honest: it appears in both
 * vocabularies and means different things, so a lookup without a type would be
 * ambiguous. Admin dispatches a PO (sending goods to the warehouse) but never
 * dispatches a kitchen request — that is the warehouse's move.
 */
export const ADMIN_REQUEST_TRANSITIONS: Record<
  AdminRequestType,
  Partial<Record<RequestStatus, readonly RequestStatus[]>>
> = {
  BRANCH_TO_ADMIN: {
    PENDING: ["APPROVED", "REJECTED", "PARTIALLY_APPROVED"],
    APPROVED: ["FORWARDED_TO_KITCHEN"],
    PARTIALLY_APPROVED: ["FORWARDED_TO_KITCHEN"],
  },
  WAREHOUSE_TO_ADMIN_PO: {
    PENDING: ["APPROVED", "PARTIALLY_APPROVED"],
    // DISPATCHED replaced IN_QUEUE in Phase 4.1.
    APPROVED: ["DISPATCHED"],
    PARTIALLY_APPROVED: ["DISPATCHED"],
    // The warehouse reported a shortfall: either accept it so they can book in
    // what arrived, or re-enqueue to send the missing goods.
    REPORTED: ["RESOLVED", "DISPATCHED"],
  },
  /**
   * Empty on purpose, and load-bearing.
   *
   * Admin can read these but never action them — approving and dispatching stay
   * with the warehouse, and the API answers 403. An empty map means the action
   * panel offers nothing by construction, so the read-only rule cannot be
   * undone by forgetting to hide a button.
   */
  KITCHEN_TO_WAREHOUSE: {},
};

export function allowedTransitions(
  type: AdminRequestType,
  status: RequestStatus,
): RequestStatus[] {
  return [...(ADMIN_REQUEST_TRANSITIONS[type]?.[status] ?? [])];
}

/**
 * `fromStatus` matters for one case: DISPATCHED out of REPORTED is a re-enqueue
 * — Admin sending the missing goods — not a first dispatch. Same status, very
 * different action, so the label has to say which.
 */
export function actionLabel(
  toStatus: RequestStatus,
  fromStatus?: RequestStatus,
): string {
  if (toStatus === "DISPATCHED" && fromStatus === "REPORTED") {
    return "Send missing goods";
  }
  switch (toStatus) {
    case "APPROVED":
      return "Approve";
    case "REJECTED":
      return "Reject";
    case "PARTIALLY_APPROVED":
      return "Partial approve";
    case "FORWARDED_TO_KITCHEN":
      return "Forward to kitchen";
    case "DISPATCHED":
      return "Dispatch to warehouse";
    case "RESOLVED":
      return "Accept shortfall";
    default:
      return toStatus
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
  }
}

/** Consequences worth stating before Admin commits to the move. */
export function adminActionHint(
  toStatus: RequestStatus,
  fromStatus?: RequestStatus,
): string | null {
  if (toStatus === "DISPATCHED" && fromStatus === "REPORTED") {
    return "Sends the missing goods. The warehouse confirms the full total for this order once everything has arrived — stock is credited once, not twice.";
  }
  if (toStatus === "RESOLVED") {
    return "Accepts what actually arrived. The warehouse can then book in the reported quantity, and the shortfall is written off rather than resent.";
  }
  if (toStatus === "DISPATCHED") {
    return "Sends the approved quantities to the warehouse. They confirm receipt, or report a problem, on their side.";
  }
  if (toStatus === "FORWARDED_TO_KITCHEN") {
    return "Only the chosen kitchen will see this request.";
  }
  return null;
}

export function isDestructiveTransition(toStatus: RequestStatus): boolean {
  return toStatus === "REJECTED";
}
