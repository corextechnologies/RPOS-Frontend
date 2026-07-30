"use client";

import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deviceServices } from "@/lib/pos/offline/device-services";
import { buildTestTicket } from "@/lib/pos/print/test-ticket";
import { toast } from "sonner";

/** Remember the last-tested printer so bring-up doesn't mean retyping the IP. */
const IP_KEY = "rpos-pos-test-printer";

/**
 * Printer bring-up. Type the printer's `IP:port` and fire a sample ticket
 * straight at it, bypassing menus/orders/config — the narrowest possible test of
 * the app → socket → printer path.
 *
 * Only functional in the native shell: a browser tab can't open a `:9100`
 * socket, so `deviceServices.canPrint` is false there and this card says so
 * rather than pretending. In Electron it's a real print.
 */
export function PrinterTestCard() {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Deferred a tick to avoid a synchronous setState in the effect body.
    const id = window.setTimeout(
      () => setAddress(window.localStorage.getItem(IP_KEY) ?? "192.168.1.50:9100"),
      0,
    );
    return () => window.clearTimeout(id);
  }, []);

  const canPrint = deviceServices.canPrint && !!deviceServices.print;

  async function testPrint() {
    const target = address.trim();
    if (!target) {
      toast.error("Enter the printer's IP, e.g. 192.168.1.50:9100");
      return;
    }
    window.localStorage.setItem(IP_KEY, target);
    setBusy(true);
    try {
      await deviceServices.print!("LAN", target, buildTestTicket(new Date().toISOString()));
      toast.success(`Test ticket sent to ${target}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Print failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Printer test</CardTitle>
        <CardDescription>
          Send a sample ticket to a LAN printer to check it&apos;s reachable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canPrint ? (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
            Printing runs in the desktop app. You&apos;re in a browser, which can&apos;t reach a
            printer directly — open this terminal in the RPOS desktop app to test.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="printer-ip">Printer address</Label>
              <Input
                id="printer-ip"
                inputMode="text"
                placeholder="192.168.1.50:9100"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <p className="text-xs text-faint">
                The printer&apos;s IP and port. Most thermal printers use port 9100.
              </p>
            </div>
            <Button className="w-full" disabled={busy} onClick={() => void testPrint()}>
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <Printer className="mr-2 size-4" aria-hidden />
              )}
              Send test print
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
