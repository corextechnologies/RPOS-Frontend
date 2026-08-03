import type {
  KitchenRequest,
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
    PRODUCED: ["DISPATCHED"],
  },
  /**
   * Empty by construction: the kitchen raises a dispatch notification but never
   * transitions it — Admin allocates it, and the dispatch/stock-move step (a
   * follow-up) will add the kitchen's own moves. Read-only until then.
   */
  KITCHEN_TO_ADMIN: {},
};

/**
 * A branch request the kitchen makes nothing for: every line is RESALE stock the
 * kitchen already holds. Such a request skips the production steps entirely.
 *
 * A line with no `kind`, or any FINISHED_GOOD / RAW_MATERIAL line, is treated as
 * makeable — so this only returns true when we're certain there's nothing to
 * produce, and mixed requests keep the normal make-then-dispatch flow.
 */
export function isResaleOnlyBranchRequest(
  request: Pick<KitchenRequest, "request_type" | "line_items">,
): boolean {
  return (
    request.request_type === "BRANCH_TO_ADMIN" &&
    request.line_items.length > 0 &&
    request.line_items.every((line) => line.kind === "RESALE")
  );
}

export function kitchenAllowedTransitions(
  type: KitchenRequestType,
  status: KitchenRequestStatus,
  opts?: { resaleOnly?: boolean },
): KitchenRequestStatus[] {
  // Resale-only branch requests have nothing to make, so they go straight from
  // FORWARDED_TO_KITCHEN to DISPATCHED — no IN_PRODUCTION / PRODUCED steps.
  if (
    opts?.resaleOnly &&
    type === "BRANCH_TO_ADMIN" &&
    status === "FORWARDED_TO_KITCHEN"
  ) {
    return ["DISPATCHED"];
  }
  return [...(KITCHEN_REQUEST_TRANSITIONS[type]?.[status] ?? [])];
}

export function kitchenActionLabel(toStatus: KitchenRequestStatus): string {
  switch (toStatus) {
    case "IN_PRODUCTION":
      return "Start production";
    case "PRODUCED":
      return "Mark produced";
    case "DISPATCHED":
      return "Dispatch to branch";
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
  if (type === "BRANCH_TO_ADMIN" && toStatus === "DISPATCHED") {
    return "Dispatching removes these quantities from your on-hand stock and sends them to the requesting branch.";
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
  return toStatus === "DISPATCHED";
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
  if (status === "DISPATCHED" && type === "BRANCH_TO_ADMIN") {
    return "Dispatched to the branch. They confirm receipt on their side.";
  }
  if (status === "RECEIVED") return "This request is closed.";
  if (status === "REJECTED") return "Admin rejected this request.";
  return "Admin has this request. You can act once it is forwarded to your kitchen.";
}
