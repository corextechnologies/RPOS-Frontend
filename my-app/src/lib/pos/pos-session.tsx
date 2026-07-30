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
import { tokens } from "@/lib/api/tokens";
import { isNetworkError, onPosSessionExpired } from "@/lib/api/pos-client";
import { posSession } from "@/lib/pos/session";
import { has } from "@/lib/pos/capabilities";
import { cacheBootstrap, readCachedBootstrap } from "@/lib/pos/offline/pos-cache";
import { isApiCode, isDeviceFault, needsRepairing, POS_ERROR } from "@/lib/api/errors";
import type { Capability, PosBootstrap } from "@/lib/types/pos";

interface PosSessionValue {
  bootstrap: PosBootstrap | null;
  loading: boolean;
  error: string | null;
  /**
   * True when `bootstrap` came from the on-device cache because the network was
   * unreachable at load, rather than from a live fetch. Drives the "offline"
   * affordance (WP-G); the till sells normally either way.
   */
  offline: boolean;
  can: (cap: Capability) => boolean;
  pinUnlock: (email: string, pin: string) => Promise<void>;
  signOut: () => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<PosSessionValue | null>(null);

export function PosSessionProvider({ children }: { children: React.ReactNode }) {
  const [bootstrap, setBootstrap] = useState<PosBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!posSession.token) {
      setBootstrap(null);
      setOffline(false);
      setLoading(false);
      return;
    }
    try {
      const b = await posApi.bootstrap();
      setBootstrap(b);
      setOffline(false);
      // Persist the pack + capabilities so a reboot mid-outage can still start
      // the till. Fire-and-forget: a cache write failing must not fail the load.
      void cacheBootstrap(b);
      setError(null);
    } catch (err) {
      // Offline is not a session fault. A cold start with no network should sell
      // from the last good bootstrap rather than bounce to sign-in — the token
      // is fine, the connection isn't. Only a *network* error qualifies; a 401 /
      // device fault is handled below because retrying it can't help.
      if (isNetworkError(err)) {
        const cached = await readCachedBootstrap();
        if (cached) {
          setBootstrap(cached.data);
          setOffline(true);
          setError(null);
          setLoading(false);
          return;
        }
      }
      // A revoked or rebound terminal must go back to activation, not sign-in:
      // dropping the paired flag makes the shell route to `/activate`.
      if (needsRepairing(err)) {
        posSession.unpair();
      } else if (!isNetworkError(err)) {
        posSession.clearSession();
      }
      setBootstrap(null);
      setOffline(false);
      setError(
        isDeviceFault(err) && err instanceof Error
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't start this terminal.",
      );
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

  const pinUnlock = useCallback(
    async (email: string, pin: string) => {
      // Cookie-first, mirroring login: the httpOnly cookie carries the device.
      // Fall back to the localStorage uid only if the server can't find one.
      let res;
      try {
        res = await posApi.pinUnlock({ email, pin });
      } catch (err) {
        if (!isApiCode(err, POS_ERROR.DEVICE_UID_MISSING)) throw err;
        const deviceUid = posSession.deviceUid;
        if (!deviceUid) throw new Error("This terminal hasn't been set up yet.");
        res = await posApi.pinUnlock({ email, pin, device_uid: deviceUid });
      }
      posSession.setSession(res.access_token, { device_id: res.device_id, branch_id: res.branch_id }, email);
      await load();
    },
    [load],
  );

  const signOut = useCallback(() => {
    posSession.clearSession();
    tokens.clear();
    setBootstrap(null);
    setError(null);
  }, []);

  const can = useCallback(
    (cap: Capability) => (bootstrap ? has(bootstrap.capabilities, cap) : false),
    [bootstrap],
  );

  const value = useMemo(
    () => ({ bootstrap, loading, error, offline, can, pinUnlock, signOut, reload: load }),
    [bootstrap, loading, error, offline, can, pinUnlock, signOut, load],
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
