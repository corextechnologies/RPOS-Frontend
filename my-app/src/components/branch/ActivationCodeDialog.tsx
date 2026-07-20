"use client";

import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Clipboard, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import type { PosDeviceActivation } from "@/lib/types/pos";

/**
 * The one-time activation code, shown the moment it arrives from register or
 * reissue. It is returned **only** here — the device list never includes it —
 * so this is the single chance to relay it. Rendered as grouped text *and* a QR
 * (the counter device scans the QR, or the operator types the code) with its
 * 24-hour expiry.
 *
 * The QR encodes the raw code, not a URL: the code is a short-lived pairing
 * secret and has no business sitting in a navigable query string.
 */
export function ActivationCodeDialog({
  device,
  open,
  onOpenChange,
}: {
  device: PosDeviceActivation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-4 text-brand" aria-hidden />
            Activation code for {device?.code ?? "terminal"}
          </DialogTitle>
          <DialogDescription>
            Enter this on the till, or scan the QR with its camera. It works once and is shown only
            now — if it&apos;s lost, reissue a new one.
          </DialogDescription>
        </DialogHeader>

        {device && <ActivationCodeBody device={device} />}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivationCodeBody({ device }: { device: PosDeviceActivation }) {
  const expiry = useMemo(() => formatExpiry(device.activation_expires_at), [
    device.activation_expires_at,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-2/50 p-5">
        <div className="rounded-lg bg-white p-3">
          <QRCodeSVG value={device.activation_code} size={160} marginSize={0} />
        </div>

        <div className="flex items-center gap-2">
          <code className="rounded-lg bg-surface px-3 py-2 font-mono text-lg font-semibold tracking-widest text-content">
            {device.activation_code}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copy activation code"
            onClick={() => {
              void navigator.clipboard.writeText(device.activation_code);
              notify("success", "Activation code copied");
            }}
          >
            <Clipboard className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <Check className="size-3.5 text-positive" aria-hidden />
        {expiry}
      </p>
    </div>
  );
}

/**
 * The server sends an absolute expiry; the brief promises the operator "expires
 * in 24h". Show whichever is meaningful without inventing precision — a bare
 * "expires in 24h" when we can't parse, the date when we can.
 */
function formatExpiry(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "Expires in 24 hours";
  return `Expires ${at.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}
