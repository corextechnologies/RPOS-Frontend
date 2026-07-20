"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MonitorSmartphone, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { posApi } from "@/lib/api/pos.api";
import { posSession } from "@/lib/pos/session";
import { AUTH_ROUTES } from "@/lib/auth/actions";
import { posErrorMessage } from "@/lib/api/errors";
import type { PosActivateResult } from "@/lib/types/pos";

/**
 * Device pairing screen — the physical till claiming its identity.
 *
 * Public, no auth token. On first run we mint a durable `device_uid` and
 * **persist it before calling activate**, then POST the activation code the
 * manager registered. Success sets the httpOnly `device_uid` cookie server-side
 * and flags the device paired, and a cashier signs in next.
 *
 * The launch state machine (`PosShell`, `/login`) routes an unpaired or
 * revoked device here; from here, success routes to sign-in.
 */
export default function ActivatePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paired, setPaired] = useState<PosActivateResult | null>(null);

  // Mint + persist the device_uid up front, so it exists before the first
  // activate call and survives a mid-flow reload.
  useEffect(() => {
    posSession.ensureDeviceUid();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const deviceUid = posSession.ensureDeviceUid();
      const result = await posApi.activate({
        activation_code: code.trim(),
        device_uid: deviceUid,
      });
      posSession.setPaired(true);
      setPaired(result);
      // Give the operator a beat to see the success, then go to sign-in.
      setTimeout(() => router.replace(AUTH_ROUTES.login), 1200);
    } catch (err) {
      setError(posErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (paired) {
    return (
      <AuthLayout
        title="Terminal paired"
        subtitle="This device is now a till. Taking you to sign in…"
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-positive/25 bg-positive/10 p-6 text-center">
          <CheckCircle2 className="size-8 text-positive" aria-hidden />
          <p className="text-sm text-content">
            Paired as terminal <span className="font-mono font-semibold">{paired.code}</span> (
            {paired.profile.toLowerCase()}).
          </p>
          <Link href={AUTH_ROUTES.login} className="text-sm font-medium text-brand hover:underline">
            Continue to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set up this terminal"
      subtitle="Enter the activation code from your branch manager to pair this device as a till."
      footer={
        <Link href={AUTH_ROUTES.login} className="font-medium text-brand hover:underline">
          Already paired? Sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3.5 py-3 text-sm text-muted">
          <MonitorSmartphone className="size-4 shrink-0 text-brand" aria-hidden />
          Your manager registers the terminal in Branch → Terminals and hands you the code (or a QR
          to scan).
        </div>

        <div className="space-y-2">
          <Label htmlFor="activation_code">Activation code</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="activation_code"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              className="pl-10 font-mono text-lg tracking-widest"
              placeholder="AB3D-9KMN"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-faint">Dashes and case don&apos;t matter.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || code.trim().length === 0}
        >
          {!submitting && <ArrowRight className="h-4 w-4" />}
          {submitting ? "Pairing…" : "Pair terminal"}
        </Button>
      </form>
    </AuthLayout>
  );
}
