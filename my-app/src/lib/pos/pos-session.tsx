"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { posApi } from "@/lib/api/pos.api";
import { onPosSessionExpired, isOfflineError } from "@/lib/api/pos-client";
import { posSession } from "@/lib/pos/session";
import { has } from "@/lib/pos/capabilities";
import { isDeviceFault } from "@/lib/api/errors";
import type { Capability, PosBootstrap } from "@/lib/types/pos";

const BOOTSTRAP_CACHE_KEY = "rpos-pos-bootstrap";

/**
 * Bootstrap is cached so a till that starts up without a network still knows
 * its branch, currency, pack and capabilities — everything except a fresh
 * `server_time`. Without this the whole offline story falls at the first step:
 * you cannot price a cart if you do not know your own minor units.
 */
function readCache(): PosBootstrap | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(BOOTSTRAP_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PosBootstrap;
  } catch {
    return null;
  }
}

function writeCache(b: PosBootstrap) {
  window.localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(b));
}

function clearCache() {
  if (typeof window !== "undefined") window.localStorage.removeItem(BOOTSTRAP_CACHE_KEY);
}

interface PosSessionValue {
  bootstrap: PosBootstrap | null;
  loading: boolean;
  /** True when we're running on cached bootstrap because the network is down. */
  stale: boolean;
  error: string | null;
  can: (cap: Capability) => boolean;
  signIn: (email: string, password: string, deviceUid: string) => Promise<void>;
  pinUnlock: (email: string, pin: string) => Promise<void>;
  signOut: () => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<PosSessionValue | null>(null);

export function PosSessionProvider({ children }: { children: React.ReactNode }) {
  const [bootstrap, setBootstrap] = useState<PosBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!posSession.token) {
      setBootstrap(null);
      setLoading(false);
      return;
    }
    try {
      const b = await posApi.bootstrap();
      setBootstrap(b);
      setStale(false);
      setError(null);
      writeCache(b);
    } catch (err) {
      // Offline is not a failure on this surface — fall back to the cache and
      // say so. Any other error means the session or device is genuinely bad.
      if (isOfflineError(err)) {
        const cached = readCache();
        if (cached) {
          setBootstrap(cached);
          setStale(true);
          setError(null);
        } else {
          setError("No connection, and this terminal has never synced.");
        }
      } else if (isDeviceFault(err)) {
        posSession.clearSession();
        clearCache();
        setBootstrap(null);
        setError(err instanceof Error ? err.message : "This terminal isn't recognised.");
      } else {
        setBootstrap(null);
        setError(err instanceof Error ? err.message : "Couldn't start this terminal.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Deferred by a tick rather than called straight from the effect body — the
  // same shape `AuthProvider` uses for its own bootstrap, and for the same
  // reason: a synchronous setState in an effect cascades renders.
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  // The client can't navigate on its own (it's imported by non-React code), so
  // it announces expiry and we drop the bootstrap, which sends the shell to the
  // sign-in gate.
  useEffect(() => onPosSessionExpired(() => setBootstrap(null)), []);

  const signIn = useCallback(
    async (email: string, password: string, deviceUid: string) => {
      const res = await posApi.login({ email, password, device_uid: deviceUid });
      posSession.setDeviceUid(deviceUid);
      posSession.setSession(res.access_token, { device_id: res.device_id, branch_id: res.branch_id }, email);
      await load();
    },
    [load],
  );

  const pinUnlock = useCallback(
    async (email: string, pin: string) => {
      const deviceUid = posSession.deviceUid;
      if (!deviceUid) throw new Error("This terminal hasn't been set up yet.");
      const res = await posApi.pinUnlock({ email, pin, device_uid: deviceUid });
      posSession.setSession(res.access_token, { device_id: res.device_id, branch_id: res.branch_id }, email);
      await load();
    },
    [load],
  );

  const signOut = useCallback(() => {
    posSession.clearSession();
    clearCache();
    setBootstrap(null);
    setError(null);
  }, []);

  const can = useCallback(
    (cap: Capability) => (bootstrap ? has(bootstrap.capabilities, cap) : false),
    [bootstrap],
  );

  const value = useMemo(
    () => ({ bootstrap, loading, stale, error, can, signIn, pinUnlock, signOut, reload: load }),
    [bootstrap, loading, stale, error, can, signIn, pinUnlock, signOut, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePosSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePosSession must be used within PosSessionProvider");
  return ctx;
}

/**
 * The bootstrap, or a throw. For screens inside the authenticated shell, where
 * the gate has already guaranteed it — saves a null check in every component.
 */
export function usePosBootstrap(): PosBootstrap {
  const { bootstrap } = usePosSession();
  if (!bootstrap) throw new Error("usePosBootstrap used outside the authenticated POS shell");
  return bootstrap;
}

/** Money formatting bound to this branch's pack. */
export function usePosCurrency() {
  const b = usePosBootstrap();
  return useMemo(
    () => ({ currency: b.pack.currency, minorUnits: b.pack.minor_units }),
    [b.pack.currency, b.pack.minor_units],
  );
}
