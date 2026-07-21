/**
 * Daily Production Targets (Admin → Kitchen).
 *
 * Admin sets a target telling one kitchen how many of each product to make on a
 * given day. The kitchen reads it, acknowledges it, then marks it complete. The
 * same target shape is read by both portals — Admin owns create/edit/delete,
 * the Kitchen owns the two status transitions.
 *
 * Status flow is strict: PENDING → ACKNOWLEDGED → COMPLETED.
 */

import { ApiError } from "@/lib/types/super-admin";

export type ProductionTargetStatus = "PENDING" | "ACKNOWLEDGED" | "COMPLETED";

export interface ProductionTargetLine {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
}

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

export function isDuplicateTarget(error: unknown): boolean {
  return error instanceof ApiError && error.code === DUPLICATE_TARGET;
}
