"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StubTaxBanner } from "@/components/pos/StubTaxBanner";
import { usePosBootstrap, usePosSession } from "@/lib/pos/pos-session";
import { posApi } from "@/lib/api/pos.api";
import { posSession } from "@/lib/pos/session";
import { clearPosCache } from "@/lib/pos/offline/pos-cache";
import { posErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

export default function PosSettingsPage() {
  const bootstrap = usePosBootstrap();
  const { signOut } = usePosSession();

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <StubTaxBanner />

      <SetPinCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This terminal</CardTitle>
          <CardDescription>Set by your admin when it was registered.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-line text-sm">
            <Row label="Branch" value={`${bootstrap.branch.code}`} />
            <Row label="Terminal" value={bootstrap.device.code} />
            <Row label="Profile" value={bootstrap.device.profile.toLowerCase()} />
            <Row label="Currency" value={bootstrap.pack.currency} />
            <Row label="Tax rules" value={bootstrap.pack.version} />
            <Row
              label="Signed in as"
              value={
                bootstrap.user.position
                  ? bootstrap.user.position.toLowerCase().replace(/_/g, " ")
                  : bootstrap.user.role.toLowerCase().replace(/_/g, " ")
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign out</CardTitle>
          <CardDescription>
            The terminal stays set up — the next person unlocks with their PIN.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign out
          </Button>
          <DecommissionButton />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Sets the CALLER's own PIN — `POST /pos/session/pin` is authenticated and
 * takes no user id. It is not an admin resetting someone else's; there is no
 * endpoint for that.
 */
function SetPinCard() {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const tooShort = pin.length > 0 && pin.length < 4;
  const mismatch = confirm.length > 0 && pin !== confirm;
  const valid = pin.length >= 4 && pin === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await posApi.setPin(pin);
      toast.success("PIN set — use it to unlock this terminal.");
      setPin("");
      setConfirm("");
    } catch (err) {
      toast.error(posErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your PIN</CardTitle>
        <CardDescription>
          Lets you unlock this terminal without typing a password at the counter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pin">New PIN</Label>
            <Input
              id="new-pin"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={8}
              className="h-12 text-center text-xl tracking-[0.4em]"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
            {tooShort && <p className="text-xs text-danger">Use at least 4 digits.</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pin">Confirm</Label>
            <Input
              id="confirm-pin"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={8}
              className="h-12 text-center text-xl tracking-[0.4em]"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            />
            {mismatch && <p className="text-xs text-danger">These don&apos;t match.</p>}
          </div>

          <Button type="submit" className="w-full" disabled={!valid || busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Set PIN
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Decommissioning clears the device identity, so the till has to be set up
 * again.
 */
function DecommissionButton() {
  const [busy, setBusy] = useState(false);

  async function decommission() {
    setBusy(true);
    try {
      posSession.reset();
      // Drop the cached menu/pack/availability too — a decommissioned till must
      // not leave a priced catalogue or branch config on the device.
      await clearPosCache();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      className="w-full text-danger hover:text-danger"
      disabled={busy}
      onClick={() => void decommission()}
    >
      Reset this terminal
    </Button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="capitalize text-content">{value}</dd>
    </div>
  );
}
