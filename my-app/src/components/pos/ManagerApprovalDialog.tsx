"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePosSession } from "@/lib/pos/pos-session";
import { posErrorMessage } from "@/lib/api/errors";

/**
 * Manager approval by PIN.
 *
 * Note what this does: it re-authenticates *as the manager* via `pin-unlock`,
 * which replaces the session token, and then retries the action. That is the
 * mechanism the backend offers — there is no "approve on behalf of" endpoint —
 * and it has a consequence worth being deliberate about: **the till is now
 * signed in as the manager.** The cashier must sign back in.
 *
 * That is a real trade-off. It is accepted here because the alternative (a
 * second, parallel token just for approvals) is a security surface invented
 * client-side to paper over a server contract, which is exactly how privilege
 * escalation bugs get written. Flagged in the implementation notes as a
 * question for the backend team: an `approved_by` PIN parameter on the action
 * itself would be better, and the AuditLog already has an `approved_by_id`
 * column suggesting they intended one.
 */
export function ManagerApprovalDialog({
  open,
  onOpenChange,
  title,
  description,
  onApproved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onApproved: () => void | Promise<void>;
}) {
  const { pinUnlock } = usePosSession();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await pinUnlock(email, pin);
      await onApproved();
      setPin("");
      setEmail("");
      onOpenChange(false);
    } catch (err) {
      setError(posErrorMessage(err));
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mgr-email">Manager email</Label>
            <Input
              id="mgr-email"
              type="email"
              autoComplete="off"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mgr-pin">Manager PIN</Label>
            <Input
              id="mgr-pin"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={8}
              className="h-14 text-center text-2xl tracking-[0.4em]"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>

          <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            Approving signs this terminal in as the manager. The previous user will need to
            unlock again.
          </p>

          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !pin}>
              Approve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
