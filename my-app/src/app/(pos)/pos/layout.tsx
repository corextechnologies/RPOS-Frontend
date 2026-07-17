"use client";

import { PosSessionProvider } from "@/lib/pos/pos-session";
import { PosShell } from "@/components/pos/PosShell";

/**
 * The till's own route tree, deliberately outside `(portals)`.
 *
 * It does not use `ProtectedPortalLayout`: that gate bootstraps through
 * `useAuth`/`GET /auth/me` with a portal token, and a portal token cannot reach
 * `/v1/pos/*` at all (403 `device_not_bound`). The POS authenticates against
 * `/pos/session/*` with a device-bound token and bootstraps from
 * `/pos/session/bootstrap`. Sharing the portal shell would mean sharing the
 * wrong credential, the wrong bootstrap, and a sidebar this screen must not have.
 */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PosSessionProvider>
      <PosShell>{children}</PosShell>
    </PosSessionProvider>
  );
}
