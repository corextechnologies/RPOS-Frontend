import type {
  KitchenRequestStatus,
  KitchenRequestType,
} from "@/lib/types/kitchen";

/**
 * Status moves the KITCHEN may make. Deliberately narrower than the full
 * workflow — everything omitted here belongs to another portal:
 *
 * - Warehouse requests: the warehouse drives PENDING → APPROVED → DISPATCHED.
 *   The kitchen only confirms receipt at the end.
 * - Branch requests: the branch raises them and Admin approves and forwards.
 *   The kitchen owns the middle three moves, and the branch closes them out.
 *
 * Kept separate from the Admin and Warehouse maps for the same reason those two
 * are separate from each other: the vocabularies differ (ALLOCATED here,
 * DISPATCHED in the warehouse, REJECTED in Admin).
 */
export const KITCHEN_REQUEST_TRANSITIONS: Record<
  KitchenRequestType,
  Partial<Record<KitchenRequestStatus, readonly KitchenRequestStatus[]>>
> = {
  KITCHEN_TO_WAREHOUSE: {
    DISPATCHED: ["RECEIVED"],
  },
  BRANCH_TO_ADMIN: {
    FORWARDED_TO_KITCHEN: ["IN_PRODUCTION"],
    IN_PRODUCTION: ["PRODUCED"],
    PRODUCED: ["ALLOCATED"],
  },
};

export function kitchenAllowedTransitions(
  type: KitchenRequestType,
  status: KitchenRequestStatus,
): KitchenRequestStatus[] {
  return [...(KITCHEN_REQUEST_TRANSITIONS[type]?.[status] ?? [])];
}

export function kitchenActionLabel(toStatus: KitchenRequestStatus): string {
  switch (toStatus) {
    case "IN_PRODUCTION":
      return "Start production";
    case "PRODUCED":
      return "Mark produced";
    case "ALLOCATED":
      return "Allocate to branch";
    case "RECEIVED":
      return "Mark received";
    default:
      return toStatus
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
  }
}

/** Consequences worth stating before the user commits to the move. */
export function kitchenActionHint(
  type: KitchenRequestType,
  toStatus: KitchenRequestStatus,
): string | null {
  if (type === "BRANCH_TO_ADMIN" && toStatus === "ALLOCATED") {
    return "Allocating removes these quantities from your on-hand stock. The branch confirms receipt on their side.";
  }
  if (type === "KITCHEN_TO_WAREHOUSE" && toStatus === "RECEIVED") {
    return "This adds the dispatched quantities to your on-hand stock.";
  }
  return null;
}

/**
 * The one move that changes stock, so the only one worth a confirmation step.
 * IN_PRODUCTION and PRODUCED are status markers — there is no recipe or BOM yet,
 * so PRODUCED does not consume ingredients.
 */
export function kitchenTransitionNeedsConfirm(
  toStatus: KitchenRequestStatus,
): boolean {
  return toStatus === "ALLOCATED";
}

/** Copy for the read-only case, so an empty panel still says whose turn it is. */
export function kitchenWaitingCopy(
  type: KitchenRequestType,
  status: KitchenRequestStatus,
): string {
  if (type === "KITCHEN_TO_WAREHOUSE") {
    if (status === "RECEIVED") return "This request is closed.";
    // Between DISPATCHED and RECEIVED the stock belongs to nobody: the warehouse
    // has decremented and the kitchen is not credited yet.
    return "The warehouse has this request. You can act once it is dispatched.";
  }
  if (status === "ALLOCATED") {
    return "Allocated. The branch confirms receipt on their side.";
  }
  if (status === "RECEIVED") return "This request is closed.";
  if (status === "REJECTED") return "Admin rejected this request.";
  return "Admin has this request. You can act once it is forwarded to your kitchen.";
}
