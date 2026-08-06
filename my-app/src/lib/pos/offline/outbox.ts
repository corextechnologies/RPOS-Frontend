/**
 * The durable outbox — every mutation the till makes offline, queued until it
 * can be replayed against the backend (§13).
 *
 * The one rule this file enforces is **persist before you send**: a queued
 * action is written to IndexedDB (durable across app kill / battery death)
 * *before* the first network attempt, so a device that dies between charging a
 * customer and telling the server still replays that sale on reboot. That is the
 * whole reason a POS needs an outbox and not just retries.
 *
 * Each entry carries its **business anchor** — the id the backend dedupes on
 * forever (§13):
 *
 * | kind          | anchor              | replays to                         |
 * |---------------|---------------------|------------------------------------|
 * | order         | `local_id`          | `POST /pos/sync/batch` (envelope)  |
 * | payment       | `client_payment_id` | `POST /pos/orders/{id}/payments`   |
 * | print_result  | `print_job_id`      | `POST /pos/print/results`          |
 * | refusal       | `local_id`          | `POST /pos/sync/batch` (refusals)  |
 * | requisition   | `local_id`          | the per-type create endpoint       |
 *
 * This is the **web/IndexedDB** implementation of the {@link OutboxStore} seam.
 * The Electron/Capacitor shells provide a SQLite-backed one behind the same
 * interface (§2); nothing above `deviceServices.outbox` knows which it is.
 *
 * The *drain* — the ordered replay, chunking, backoff and per-element result
 * handling — is WP-E. This file is only the store: enqueue, query, and the
 * state transitions the drain will drive.
 */

import type { Minor } from "@/lib/money";
import type { PaymentInput, PosOrderCreate, SyncRefusal } from "@/lib/types/pos";
import { OUTBOX_INDEX_KIND, OUTBOX_STORE, promisifyRequest, withStore } from "./db";
import { uuid } from "@/lib/pos/idempotency";

// ---- entry shapes ----

export type OutboxKind = "order" | "payment" | "print_result" | "refusal" | "requisition";

/**
 * - `pending`   — queued, never attempted (or reset for retry).
 * - `in_flight` — a drain pass is sending it right now; skip it on a concurrent tick.
 * - `failed`    — the last attempt errored; retryable once `next_attempt_at` passes.
 *
 * There is deliberately no `done`: a settled entry is *removed*, so the store
 * size tracks real backlog and `count()` is the "N queued" badge without a filter.
 */
export type OutboxState = "pending" | "in_flight" | "failed";

interface OutboxEntryBase {
  /** The outbox row id (uuid). Distinct from the business anchor. */
  id: string;
  /** Monotonic within a device session — the drain replays in this order (FIFO). */
  seq: number;
  state: OutboxState;
  attempts: number;
  created_at: string;
  updated_at: string;
  last_error?: string | null;
  /** Set by {@link markFailed} for backoff; the drain skips the entry until then. */
  next_attempt_at?: string | null;
}

/** One §9 sync envelope's worth of order — everything the drain needs to replay it. */
export interface OrderOutboxBody {
  /** Includes `local_id`; do NOT set `expected_total_minor` (sync flags drift, never 409s). */
  order: PosOrderCreate;
  /** What the device actually charged offline. */
  device_total_minor: Minor;
  /** NEW·P3 — the kitchen ticket was fired offline, so the server settles stock + sales. */
  was_sent: boolean;
  /** NEW·P3 — advisory device timestamp; the server stamps the authoritative one. */
  device_sent_at?: string | null;
  /** NEW·P3 — what already printed offline, so the kitchen doesn't re-print on reconnect. */
  print_results?: Array<{ station_id?: number; kind: "KITCHEN" | "RECEIPT"; state: string }>;
}

/**
 * A tender captured offline. Referenced by the order's `local_id`, not a server
 * order id — offline there isn't one yet. The drain resolves it to the real
 * `order_id` after the order envelope settles (which is why payments drain
 * strictly after orders, §13).
 */
export interface PaymentOutboxBody {
  order_local_id: string;
  /** Carries `client_payment_id` (the anchor) and, for ONLINE, `payment_account_id`. */
  payment: PaymentInput;
}

/** A print outcome to report — the offline path of §11's `POST /pos/print/results`. */
export interface PrintResultOutboxBody {
  print_job_id: number;
  state: "PRINTED" | "FAILED";
  error?: string | null;
}

/**
 * A demand refusal captured offline — the device's half of the turn-away
 * recording. Replays as one entry in the sync batch's `refusals` list; the body
 * carries its own `local_id` (also the anchor), so a retried upload can't
 * double-count.
 */
export type RefusalOutboxBody = SyncRefusal;

/** A cross-location requisition (§12) — no LAN path, so it always queues. */
export interface RequisitionOutboxBody {
  /** `/branch/requests` | `/kitchen/requests/warehouse` | `/warehouse/requests/po`. */
  endpoint: string;
  local_id: string;
  payload: unknown;
}

export type OutboxEntry =
  | (OutboxEntryBase & { kind: "order"; anchor: string; body: OrderOutboxBody })
  | (OutboxEntryBase & { kind: "payment"; anchor: string; body: PaymentOutboxBody })
  | (OutboxEntryBase & { kind: "print_result"; anchor: string; body: PrintResultOutboxBody })
  | (OutboxEntryBase & { kind: "refusal"; anchor: string; body: RefusalOutboxBody })
  | (OutboxEntryBase & { kind: "requisition"; anchor: string; body: RequisitionOutboxBody });

/** The entry variant for one kind — so `byKind("order")` narrows `body` to the order shape. */
export type OutboxEntryOf<K extends OutboxKind> = Extract<OutboxEntry, { kind: K }>;

/** What a caller hands {@link OutboxStore.enqueue}; the store stamps the rest. */
export type NewOutboxEntry =
  | { kind: "order"; anchor: string; body: OrderOutboxBody }
  | { kind: "payment"; anchor: string; body: PaymentOutboxBody }
  | { kind: "print_result"; anchor: string; body: PrintResultOutboxBody }
  | { kind: "refusal"; anchor: string; body: RefusalOutboxBody }
  | { kind: "requisition"; anchor: string; body: RequisitionOutboxBody };

// ---- the seam ----

export interface OutboxStore {
  /**
   * Persist a new entry (state `pending`) and return it. **Await this before the
   * first send attempt** — that ordering is the durability guarantee. Idempotent
   * on the business anchor: enqueuing a `(kind, anchor)` that already exists
   * returns the existing entry rather than a duplicate, so a double-tap on
   * "Send" or a re-render can't fork one order into two queued sales.
   */
  enqueue<K extends OutboxKind>(input: Extract<NewOutboxEntry, { kind: K }>): Promise<OutboxEntryOf<K>>;
  /** The existing entry for a business anchor, or null. The dedup lookup. */
  findByAnchor<K extends OutboxKind>(kind: K, anchor: string): Promise<OutboxEntryOf<K> | null>;
  /** Every entry of a kind, FIFO. The drain's per-stage work list. */
  byKind<K extends OutboxKind>(kind: K): Promise<OutboxEntryOf<K>[]>;
  /** Every entry, FIFO — for a manager "unsynced" view. */
  all(): Promise<OutboxEntry[]>;
  /** How many actions are still queued — the "N queued" badge. */
  count(): Promise<number>;
  markInFlight(id: string): Promise<void>;
  /** Record a failure: bump attempts, store the error, schedule the next retry. */
  markFailed(id: string, error: string): Promise<void>;
  /** Put a claimed entry back to `pending` (e.g. the drain aborted mid-flight). */
  reset(id: string): Promise<void>;
  /** Settled — drop it. The drain calls this on `accepted`/`duplicate`. */
  remove(id: string): Promise<void>;
}

// ---- backoff ----

const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60_000;

/** Exponential backoff, capped. `attempts` is the count *after* the failure. */
export function backoffMs(attempts: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1), BACKOFF_MAX_MS);
}

/**
 * Whether the drain may claim this entry now. `in_flight` is never due (another
 * pass owns it); a `failed` entry waits out its backoff; `pending` is always due.
 */
export function isDue(entry: OutboxEntry, now: number = Date.now()): boolean {
  if (entry.state === "in_flight") return false;
  if (entry.next_attempt_at) return Date.parse(entry.next_attempt_at) <= now;
  return true;
}

// ---- monotonic sequence ----

// getAll() returns entries by key (a random uuid), not insertion order, so FIFO
// needs an explicit ordinal. Date.now() alone ties inside a tight loop; clamp it
// strictly upward so `seq` is unique and increasing across a session, and still
// moves forward across restarts (wall-clock only advances).
let lastSeq = 0;
function nextSeq(): number {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
}

function bySeq(a: OutboxEntry, b: OutboxEntry): number {
  return a.seq - b.seq;
}

// ---- the IndexedDB implementation ----

async function readAll(): Promise<OutboxEntry[]> {
  return withStore(
    OUTBOX_STORE,
    "readonly",
    async (os) => {
      const rows = await promisifyRequest<OutboxEntry[]>(os.getAll());
      return rows.sort(bySeq);
    },
    [],
  );
}

async function readByKind(kind: OutboxKind): Promise<OutboxEntry[]> {
  return withStore(
    OUTBOX_STORE,
    "readonly",
    async (os) => {
      const rows = await promisifyRequest<OutboxEntry[]>(
        os.index(OUTBOX_INDEX_KIND).getAll(kind),
      );
      return rows.sort(bySeq);
    },
    [],
  );
}

async function patch(id: string, mut: (entry: OutboxEntry) => void): Promise<void> {
  await withStore(
    OUTBOX_STORE,
    "readwrite",
    async (os) => {
      const entry = await promisifyRequest<OutboxEntry | undefined>(os.get(id));
      if (!entry) return;
      mut(entry);
      entry.updated_at = new Date().toISOString();
      os.put(entry);
    },
    undefined,
  );
}

export const idbOutbox: OutboxStore = {
  async enqueue<K extends OutboxKind>(input: Extract<NewOutboxEntry, { kind: K }>) {
    const existing = await this.findByAnchor<K>(input.kind, input.anchor);
    if (existing) return existing;

    const now = new Date().toISOString();
    const entry = {
      id: uuid(),
      seq: nextSeq(),
      state: "pending" as const,
      attempts: 0,
      created_at: now,
      updated_at: now,
      last_error: null,
      next_attempt_at: null,
      ...input,
    } as OutboxEntry;

    await withStore(
      OUTBOX_STORE,
      "readwrite",
      (os) => {
        os.put(entry);
      },
      undefined,
    );
    return entry as OutboxEntryOf<K>;
  },

  async findByAnchor<K extends OutboxKind>(kind: K, anchor: string) {
    const rows = await readByKind(kind);
    return (rows.find((e) => e.anchor === anchor) ?? null) as OutboxEntryOf<K> | null;
  },

  byKind<K extends OutboxKind>(kind: K) {
    return readByKind(kind) as Promise<OutboxEntryOf<K>[]>;
  },

  all() {
    return readAll();
  },

  async count() {
    return withStore(
      OUTBOX_STORE,
      "readonly",
      (os) => promisifyRequest<number>(os.count()),
      0,
    );
  },

  async markInFlight(id) {
    await patch(id, (e) => {
      e.state = "in_flight";
    });
  },

  async markFailed(id, error) {
    await patch(id, (e) => {
      e.attempts += 1;
      e.state = "failed";
      e.last_error = error;
      e.next_attempt_at = new Date(Date.now() + backoffMs(e.attempts)).toISOString();
    });
  },

  async reset(id) {
    await patch(id, (e) => {
      e.state = "pending";
    });
  },

  async remove(id) {
    await withStore(
      OUTBOX_STORE,
      "readwrite",
      (os) => {
        os.delete(id);
      },
      undefined,
    );
  },
};
