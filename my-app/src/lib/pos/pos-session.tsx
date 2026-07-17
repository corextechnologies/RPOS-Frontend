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
import { onPosSessionExpired } from "@/lib/api/pos-client";
import { posSession } from "@/lib/pos/session";
import { has } from "@/lib/pos/capabilities";
import { isDeviceFault } from "@/lib/api/errors";
import type { Capability, PosBootstrap } from "@/lib/types/pos";

interface PosSessionValue {
  bootstrap: PosBootstrap | null;
  loading: boolean;
  error: string | null;
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

  const load = useCallback(async () => {
    if (!posSession.token) {
      setBootstrap(null);
      setLoading(false);
      return;
    }
    try {
      const b = await posApi.bootstrap();
      setBootstrap(b);
      setError(null);
    } catch (err) {
      if (isDeviceFault(err)) {
        posSession.clearSession();
        setBootstrap(null);
        setError(err instanceof Error ? err.message : "This terminal isn't recognised.");
      } else {
        posSession.clearSession();
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
    tokens.clear();
    setBootstrap(null);
    setError(null);
  }, []);

  const can = useCallback(
    (cap: Capability) => (bootstrap ? has(bootstrap.capabilities, cap) : false),
    [bootstrap],
  );

  const value = useMemo(
    () => ({ bootstrap, loading, error, can, pinUnlock, signOut, reload: load }),
    [bootstrap, loading, error, can, pinUnlock, signOut, load],
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
