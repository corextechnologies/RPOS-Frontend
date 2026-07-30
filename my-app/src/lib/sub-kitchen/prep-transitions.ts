import type { PrepStatus, PrepStatusTarget } from "@/lib/types/sub-kitchen";

/**
 * The status moves the prep board may make via `/status`. COMPLETED is not here
 * — it moves stock and goes through `/complete`. Kept in one place so the board
 * buttons and the mock's guard read the same rules.
 */
export const PREP_TRANSITIONS: Partial<Record<PrepStatus, readonly PrepStatusTarget[]>> = {
  QUEUED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "CANCELLED"],
  READY: ["IN_PROGRESS", "CANCELLED"],
};

export function prepAllowedTransitions(status: PrepStatus): PrepStatusTarget[] {
  return [...(PREP_TRANSITIONS[status] ?? [])];
}

export function isPrepTransitionAllowed(
  from: PrepStatus,
  to: PrepStatusTarget,
): boolean {
  return prepAllowedTransitions(from).includes(to);
}

/** Whether a ticket is still workable (not completed or cancelled). */
export function isPrepOpen(status: PrepStatus): boolean {
  return status === "QUEUED" || status === "IN_PROGRESS" || status === "READY";
}

/** Button label for a status move. */
export function prepActionLabel(to: PrepStatusTarget): string {
  switch (to) {
    case "IN_PROGRESS":
      return "Start";
    case "READY":
      return "Mark ready";
    case "CANCELLED":
      return "Cancel";
  }
}

/** Human label for a status badge. */
export function prepStatusLabel(status: PrepStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
