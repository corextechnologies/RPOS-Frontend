/**
 * The offline outbox.
 *
 * Every order this terminal creates is written here FIRST and posted second.
 * That ordering is the whole offline story and it is why this module exists at
 * the foundation rather than arriving with the sync slice: a queue bolted on
 * later is a rewrite of every screen that ever called the API directly. The
 * server's own plan says the same thing about its half — offline "is not
 * optional polish and must not be pushed to the end".
 *
 * IndexedDB rather than localStorage: localStorage is synchronous (it blocks
 * the render of a screen someone is typing into), string-only, and capped
 * around 5MB. A day of orders on a busy till will exceed that.
 *
 * No `idb` dependency — the surface used here is small enough that a wrapper is
 * cheaper than a package, and this file is the only place raw IndexedDB appears.
 */

import type { PosOrderCreate, SyncElementStatus } from "@/lib/types/pos";
import type { Minor } from "@/lib/money";
import { newIdempotencyKey } from "./idempotency";

const DB_NAME = "rpos-pos";
const DB_VERSION = 1;
const STORE = "outbox";

export interface OutboxRecord {
  /** Primary key. The order's business identity, stable across every retry. */
  local_id: string;
  order: PosOrderCreate;
  /** What the device believed the total was, for the server's conflict check. */
  device_total_minor: Minor;
  /**
   * Minted once and REUSED on every retry — that is what makes a retry a replay
   * instead of a second order. Regenerating this per attempt would defeat the
   * entire mechanism.
   */
  idempotency_key: string;
  created_at: number;
  attempts: number;
  last_error?: string;
  /** Absent until the server has ruled on it. */
  result?: SyncElementStatus;
  order_id?: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "local_id" });
          store.createIndex("created_at", "created_at");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Notified on every mutation so the queue-depth indicator stays honest. */
export function onOutboxChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn();
}

export const outbox = {
  /**
   * Write the order down before trying to send it. Returns the record so the
   * caller can post it immediately — the common online path is enqueue, post,
   * resolve, all within a second.
   */
  async enqueue(order: PosOrderCreate, deviceTotalMinor: Minor): Promise<OutboxRecord> {
    const record: OutboxRecord = {
      local_id: order.local_id,
      order,
      device_total_minor: deviceTotalMinor,
      idempotency_key: newIdempotencyKey(),
      created_at: Date.now(),
      attempts: 0,
    };
    await tx("readwrite", (s) => s.put(record));
    emit();
    return record;
  },

  async get(localId: string): Promise<OutboxRecord | undefined> {
    return tx<OutboxRecord | undefined>("readonly", (s) => s.get(localId));
  },

  async all(): Promise<OutboxRecord[]> {
    const rows = await tx<OutboxRecord[]>("readonly", (s) => s.getAll());
    return rows.sort((a, b) => a.created_at - b.created_at);
  },

  /** Everything still owed to the server, oldest first — the send order. */
  async pending(): Promise<OutboxRecord[]> {
    const rows = await outbox.all();
    return rows.filter((r) => r.result !== "accepted" && r.result !== "duplicate");
  },

  async update(localId: string, patch: Partial<OutboxRecord>): Promise<void> {
    const existing = await outbox.get(localId);
    if (!existing) return;
    await tx("readwrite", (s) => s.put({ ...existing, ...patch }));
    emit();
  },

  async remove(localId: string): Promise<void> {
    await tx("readwrite", (s) => s.delete(localId));
    emit();
  },

  /**
   * Drops orders the server has confirmed. `flagged` is deliberately KEPT: the
   * sale is real and accepted, but a manager still has to look at it, and
   * deleting it here would erase the only local trace of a discrepancy.
   */
  async pruneSettled(): Promise<void> {
    const rows = await outbox.all();
    for (const r of rows) {
      if (r.result === "accepted" || r.result === "duplicate") {
        await tx("readwrite", (s) => s.delete(r.local_id));
      }
    }
    emit();
  },

  async clear(): Promise<void> {
    await tx("readwrite", (s) => s.clear());
    emit();
  },
};

export interface OutboxStats {
  pending: number;
  failed: number;
  flagged: number;
  /** Epoch ms of the oldest unsent order — what the indicator actually shows. */
  oldestAt: number | null;
}

export async function outboxStats(): Promise<OutboxStats> {
  const rows = await outbox.all();
  const pending = rows.filter((r) => r.result !== "accepted" && r.result !== "duplicate");
  return {
    pending: pending.length,
    failed: rows.filter((r) => r.result === "failed").length,
    flagged: rows.filter((r) => r.result === "flagged").length,
    oldestAt: pending.length ? Math.min(...pending.map((r) => r.created_at)) : null,
  };
}
