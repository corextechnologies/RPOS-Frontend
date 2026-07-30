/**
 * Sub-Kitchen — the branch final-prep station.
 *
 * A prep board of tickets the branch Chef works: made-to-order jobs that arrive
 * from the POS (`source: "ORDER"`, with the customer's note) and the chef's own
 * prep-ahead jobs (`source: "BATCH"`). Completing a ticket moves branch stock —
 * a BATCH adds the finished item back, an ORDER does not (it went to the guest).
 *
 * These are branch PORTAL routes (`/v1/branch/sub-kitchen/*`), served with the
 * caller's portal token — not the POS device token. Read ids are normalized to
 * strings the way every other portal read model is.
 */

// ---- Prep tickets / board ----

export type PrepSource = "ORDER" | "BATCH";

export type PrepStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

/**
 * The statuses the `/status` endpoint may set. COMPLETED is deliberately absent
 * — it moves stock, so it has its own endpoint (409 `use_complete_endpoint`).
 */
export type PrepStatusTarget = "IN_PROGRESS" | "READY" | "CANCELLED";

export interface PrepTicket {
  id: string;
  branch_id: string;
  source: PrepSource;
  status: PrepStatus;
  product_id: string;
  product_name: string;
  quantity: number;
  /** The customer's request on an ORDER ticket (e.g. the name to write on a cake). */
  customization_note: string | null;
  note: string | null;
  order_id: string | null;
  order_line_id: string | null;
  production_run_id: string | null;
  recipe_id: string | null;
  /** Higher works first; then soonest `due_at`; then oldest. */
  priority: number;
  due_at: string | null;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface PrepBoardFilters {
  /** Omit for the working board (QUEUED + IN_PROGRESS + READY). */
  status?: PrepStatus;
  page?: number;
  page_size?: number;
}

/** Body for `POST /branch/sub-kitchen/batch` — only product + quantity required. */
export interface CreateBatchInput {
  product_id: number;
  quantity: number;
  batch_code?: string | null;
  expiry_date?: string | null;
  customization_note?: string | null;
  note?: string | null;
  priority?: number;
  due_at?: string | null;
}

/** Body for `PATCH /branch/sub-kitchen/tickets/{id}/status`. */
export interface UpdatePrepStatusInput {
  status: PrepStatusTarget;
}

/** One hand-stated input for a no-recipe completion. */
export interface CompleteInputLine {
  product_id: number;
  quantity: number;
  batch_code?: string | null;
}

/**
 * Body for `POST /branch/sub-kitchen/tickets/{id}/complete`. Empty for the
 * recipe-driven case; `inputs` for a one-off with no recipe. `batch_code` /
 * `expiry_date` override what the ticket was created with.
 */
export interface CompleteTicketInput {
  inputs?: CompleteInputLine[];
  batch_code?: string | null;
  expiry_date?: string | null;
}

// ---- Error codes (409) ----

/** COMPLETED can't be set via `/status`; it moves stock and has its own endpoint. */
export const PREP_USE_COMPLETE_ENDPOINT = "use_complete_endpoint";
/** A status hop the prep flow doesn't allow. */
export const PREP_INVALID_TRANSITION = "invalid_prep_transition";
/** The ticket is already completed or cancelled. */
export const PREP_NOT_OPEN = "prep_not_open";
/** A branch-only endpoint hit by a non-chef/manager position. */
export const PREP_POSITION_FORBIDDEN = "position_forbidden";
