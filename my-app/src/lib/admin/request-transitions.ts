import type {
  AdminRequestType,
  RequestStatus,
} from "@/lib/types/admin";

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
    APPROVED: ["IN_QUEUE"],
    PARTIALLY_APPROVED: ["IN_QUEUE"],
  },
};

export function allowedTransitions(
  type: AdminRequestType,
  status: RequestStatus,
): RequestStatus[] {
  return [...(ADMIN_REQUEST_TRANSITIONS[type]?.[status] ?? [])];
}

export function actionLabel(toStatus: RequestStatus): string {
  switch (toStatus) {
    case "APPROVED":
      return "Approve";
    case "REJECTED":
      return "Reject";
    case "PARTIALLY_APPROVED":
      return "Partial approve";
    case "FORWARDED_TO_KITCHEN":
      return "Forward to kitchen";
    case "IN_QUEUE":
      return "Move to queue";
    default:
      return toStatus
        .split("_")
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(" ");
  }
}

export function isDestructiveTransition(toStatus: RequestStatus): boolean {
  return toStatus === "REJECTED";
}
