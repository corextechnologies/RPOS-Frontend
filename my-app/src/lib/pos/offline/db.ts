/**
 * The POS device's durable store.
 *
 * A browser tab can hold a React Query cache in memory, but that cache dies on
 * reload and a till reboots — after a power blip, at shift change, when the OS
 * kills a backgrounded tab. Offline-first means the menu the cashier sells from
 * and (WP-C) the queue of unsynced sales have to survive that, so they live in
 * **IndexedDB**, not memory and not `localStorage`.
 *
 * Why IndexedDB and not `localStorage`:
 * - `localStorage` is synchronous and ~5 MB; a menu snapshot plus an outbox of a
 *   few hundred orders blows past it and blocks the main thread doing so.
 * - IndexedDB stores structured values (no `JSON.parse` per read) and gives the
 *   outbox real indexes (by state, by kind) for the drain in WP-E.
 *
 * This module is the **web/dev** storage backend. The COUNTER (Electron) and
 * CURBSIDE (Capacitor) shells will provide a SQLite-backed store behind the same
 * `DeviceServices` seam (§2 of the contract); nothing above this file should
 * import `indexedDB` directly, so that swap stays a one-file change.
 *
 * Everything here degrades to a no-op that resolves `null` when IndexedDB is
 * absent (SSR, private-mode Firefox, a locked-down kiosk browser). The POS then
 * behaves exactly as it does today — online-only, no cache — rather than
 * throwing on boot. Offline is an enhancement layered on top; its absence must
 * never take the till down.
 */

const DB_NAME = "rpos-pos";
const DB_VERSION = 1;

/** Snapshot store: cached menu, bootstrap, availability, config (WP-B). */
export const KV_STORE = "kv";
/** Durable outbox: queued orders/payments/print-results/requisitions (WP-C). */
export const OUTBOX_STORE = "outbox";

/**
 * Created in v1 even though WP-B doesn't use it, so adding the outbox in WP-C is
 * a code change and not a schema migration (an `onupgradeneeded` bump would have
 * to run on every already-installed till, mid-life).
 */
export const OUTBOX_INDEX_STATE = "by_state";
export const OUTBOX_INDEX_KIND = "by_kind";

function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Open (and, first time, create) the database. Memoised — every helper shares
 * one connection. Resolves `null` rather than rejecting when IndexedDB is
 * unavailable, so callers branch on a value instead of wrapping every call in a
 * try/catch.
 */
export function openDb(): Promise<IDBDatabase | null> {
  if (!idbAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV_STORE)) {
        // Out-of-line keys: the caller passes the key (`snapshot:menu`, …).
        db.createObjectStore(KV_STORE);
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
        // The drain (WP-E) walks pending entries in FIFO order and filters by
        // kind; both wants an index rather than a full-store scan per tick.
        outbox.createIndex(OUTBOX_INDEX_STATE, "state", { unique: false });
        outbox.createIndex(OUTBOX_INDEX_KIND, "kind", { unique: false });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      // A second tab bumping the version would otherwise wedge this connection
      // and every pending transaction on it; close so the newer one proceeds.
      db.onversionchange = () => db.close();
      resolve(db);
    };

    // A blocked/failed open is not fatal — fall back to the no-cache path.
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });

  return dbPromise;
}

/** Promisify one request inside an already-opened transaction. */
function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Run `fn` against one object store in its own transaction. The shared shape all
 * the typed helpers below are built on. Swallows open/transaction failures to
 * the caller's `fallback`, because a cache read that throws is worse than a
 * cache miss — the whole point of the cache is resilience.
 */
export async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
  fallback: T,
): Promise<T> {
  const db = await openDb();
  if (!db) return fallback;
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const os = tx.objectStore(store);
      Promise.resolve(fn(os)).then((result) => {
        // Resolve on `tx.oncomplete`, not on the request, so a write is durable
        // before the caller proceeds (matters for the outbox: persisted BEFORE
        // the first send attempt is the §13 rule).
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }, reject);
    });
  } catch {
    return fallback;
  }
}

// ---- kv helpers (WP-B) ----

export async function kvGet<T>(key: string): Promise<T | null> {
  return withStore(
    KV_STORE,
    "readonly",
    async (os) => {
      const value = await promisifyRequest<unknown>(os.get(key));
      return (value ?? null) as T | null;
    },
    null,
  );
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await withStore(
    KV_STORE,
    "readwrite",
    (os) => {
      os.put(value as unknown, key);
    },
    undefined,
  );
}

export async function kvDelete(key: string): Promise<void> {
  await withStore(
    KV_STORE,
    "readwrite",
    (os) => {
      os.delete(key);
    },
    undefined,
  );
}
