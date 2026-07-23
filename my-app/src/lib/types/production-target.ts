/**
 * Daily Production Targets (Admin → Kitchen → Branch).
 *
 * Admin sets a target telling one kitchen how many of each product to make on a
 * given day. The full lifecycle then runs across three portals:
 *
 *   PENDING        Admin created it; the kitchen has not picked it up.
 *   ACKNOWLEDGED   Kitchen has seen it and owns it.
 *   IN_PRODUCTION  Kitchen has started — it produces the made items (finished
 *                  goods) and gathers the resale items the target also lists.
 *   COMPLETED      Everything on the target is ready; Admin is notified.
 *   ALLOCATED      Admin has split the ready quantities across branches.
 *   DISPATCHED     Kitchen has shipped the allocated quantities.
 *   RECEIVED       Every branch has confirmed receipt on its Incoming screen.
 *
 * Ownership by portal: Admin creates/edits/deletes and allocates; the Kitchen
 * drives acknowledge → in-production → complete → dispatch; each Branch confirms
 * its own allocation, and the target reaches RECEIVED once all of them have.
 *
 * A target line carries a `kind`: made items (`FINISHED_GOOD`) are produced,
 * `RESALE` items are stock the kitchen already holds and simply adds for
 * dispatch. Both are tracked to "ready" via the same `produced` flag.
 */

import type { ProductKind, RequestBranchAllocation } from "@/lib/types/admin";
import { ApiError } from "@/lib/types/super-admin";

export type ProductionTargetStatus =
  | "PENDING"
  | "ACKNOWLEDGED"
  | "IN_PRODUCTION"
  | "COMPLETED"
  | "ALLOCATED"
  | "DISPATCHED"
  | "RECEIVED";

export interface ProductionTargetLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  /**
   * What this line is. `FINISHED_GOOD` lines are made in the kitchen; `RESALE`
   * lines are held stock added for dispatch. Never `RAW_MATERIAL` — a target is
   * about sellable output, not ingredients.
   */
  kind: ProductKind;
  /**
   * Marked once the kitchen has made this line (finished goods) or set it aside
   * for dispatch (resale). All lines must be `produced` before a target can be
   * completed. Meaningful only from IN_PRODUCTION onward.
   */
  produced: boolean;
}

/**
 * Per-branch split of a ready line. Reuses the same shape the dispatch-request
 * flow uses, so the Branch Incoming screen can treat both identically — its
 * `id` is the unit a branch receives.
 */
export type ProductionTargetAllocation = RequestBranchAllocation;

export interface ProductionTarget {
  id: string;
  kitchen_id: string;
  kitchen_name: string;
  /** Plain calendar date, `YYYY-MM-DD`. */
  target_date: string;
  status: ProductionTargetStatus;
  note: string | null;
  created_at: string;
  lines: ProductionTargetLine[];
  /** Present once Admin has allocated the target across branches. */
  allocations?: ProductionTargetAllocation[];
}

// ---- Inputs ----

export interface ProductionTargetLineInput {
  product_id: string;
  quantity: number;
}

export interface CreateProductionTargetInput {
  kitchen_id: string;
  /** `YYYY-MM-DD`. */
  target_date: string;
  note?: string;
  lines: ProductionTargetLineInput[];
}

/**
 * Partial, and only accepted while PENDING. `lines`, when present, is a full
 * replacement — not a merge. Omit either field to leave it unchanged.
 */
export interface UpdateProductionTargetInput {
  note?: string;
  lines?: ProductionTargetLineInput[];
}

/** One product's quantity earmarked for one branch when Admin allocates. */
export interface ProductionTargetAllocationInput {
  line_id: string;
  branch_id: string;
  quantity: number;
}

/**
 * Body for allocating a COMPLETED target across branches. A line may fan out to
 * several branches; the per-line total can't exceed the quantity produced.
 */
export interface AllocateProductionTargetInput {
  allocations: ProductionTargetAllocationInput[];
  note?: string;
}

// ---- Filters ----

/** Admin can narrow by kitchen and/or date; both optional. */
export interface AdminProductionTargetFilters {
  kitchen_id?: string;
  /** `YYYY-MM-DD`. */
  date?: string;
}

/** Kitchen list is auto-scoped to the logged-in manager's kitchen. */
export interface KitchenProductionTargetFilters {
  /** `YYYY-MM-DD`. */
  date?: string;
}

// ---- Error codes (409) ----

/** A target already exists for that kitchen on that date. */
export const DUPLICATE_TARGET = "duplicate_target";
/** Edit attempted on a target that is no longer PENDING. */
export const TARGET_NOT_EDITABLE = "target_not_editable";
/** Delete attempted on a target that is no longer PENDING. */
export const TARGET_NOT_DELETABLE = "target_not_deletable";
/** A status transition that the flow does not allow. */
export const INVALID_TARGET_STATUS = "invalid_target_status";
/** Allocated more of a line than the kitchen produced. */
export const TARGET_ALLOCATION_EXCEEDS_PRODUCED = "target_allocation_exceeds_produced";

export function isDuplicateTarget(error: unknown): boolean {
  return error instanceof ApiError && error.code === DUPLICATE_TARGET;
}
