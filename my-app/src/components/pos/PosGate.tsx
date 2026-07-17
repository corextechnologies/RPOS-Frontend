"use client";

import { useState } from "react";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { usePosSession } from "@/lib/pos/pos-session";
import { POS_REGIONS, posSession } from "@/lib/pos/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { posErrorMessage } from "@/lib/api/errors";

/**
 * The POS sign-in gate.
 *
 * Three states, and which one you get depends on what the terminal already
 * knows — a till that has been commissioned should never ask for its own
 * identity again:
 *
 * - **Commission** — no `device_uid` stored. Asks for the terminal code once.
 * - **PIN** — device known, a user has signed in here before. The fast path,
 *   and the common one: one field, no keyboard, no email.
 * - **Password** — device known, but full sign-in requested (first user of the
 *   day, or PIN forgotten).
 */
export function PosGate() {
  const { signIn, pinUnlock, error: sessionError } = usePosSession();

  const [deviceUid, setDeviceUid] = useState(posSession.deviceUid ?? "");
  const [commissioned, setCommissioned] = useState(!!posSession.deviceUid);
  const [mode, setMode] = useState<"pin" | "password">(
    posSession.lastEmail ? "pin" : "password",
  );

  const [email, setEmail] = useState(posSession.lastEmail ?? "");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState(posSession.region ?? POS_REGIONS[0].code);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Stored locally only. Never sent — the region pick selects language, not
      // a tax rate; the branch record decides that, server-side.
      posSession.setRegion(region);
      if (mode === "pin") {
        await pinUnlock(email, pin);
      } else {
        await signIn(email, password, deviceUid.trim());
      }
    } catch (err) {
      setError(posErrorMessage(err));
      setPin("");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  if (!commissioned) {
    return (
      <Shell title="Set up this terminal" subtitle="One-time. It stays set after sign-out.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (deviceUid.trim()) setCommissioned(true);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="device_uid">Terminal code</Label>
            <Input
              id="device_uid"
              autoFocus
              autoCapitalize="characters"
              placeholder="TERMINAL-0001"
              value={deviceUid}
              onChange={(e) => setDeviceUid(e.target.value)}
            />
            <p className="text-xs text-faint">
              Given to you by your admin when this terminal was registered.
            </p>
          </div>
          <Button type="submit" className="h-12 w-full text-base" disabled={!deviceUid.trim()}>
            Continue
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell
      title={mode === "pin" ? "Enter your PIN" : "Sign in"}
      subtitle={`Terminal ${posSession.deviceUid ?? deviceUid}`}
    >
      <form onSubmit={submit} className="space-y-4">
        {mode === "password" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </>
        )}

        {mode === "pin" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="pin-email">Email</Label>
              <Input
                id="pin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                // `inputMode` (not type=number) so a tablet shows a numeric pad
                // without the spinner and scroll-to-change behaviour a till
                // absolutely must not have.
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoFocus
                maxLength={8}
                className="h-14 text-center text-2xl tracking-[0.4em]"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-content"
          >
            {POS_REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          {/* Said plainly because it is the exact misunderstanding that would
              let a cashier think they can change what's charged. */}
          <p className="text-xs text-faint">
            Sets language and shows which rules are live. Tax always comes from the branch, not
            from this.
          </p>
        </div>

        {(error ?? sessionError) && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error ?? sessionError}
          </p>
        )}

        <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
          {mode === "pin" ? "Unlock" : "Sign in"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => {
              setMode(mode === "pin" ? "password" : "pin");
              setError(null);
              setPin("");
              setPassword("");
            }}
          >
            {mode === "pin" ? "Use password instead" : "Use PIN instead"}
          </button>
          <button
            type="button"
            className="text-faint hover:text-muted hover:underline"
            onClick={() => {
              posSession.reset();
              setCommissioned(false);
              setDeviceUid("");
            }}
          >
            Change terminal
          </button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <div className="space-y-1 text-center">
          <MonitorSmartphone className="mx-auto size-8 text-brand" aria-hidden />
          <h1 className="font-display text-xl font-semibold tracking-tight text-content">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
