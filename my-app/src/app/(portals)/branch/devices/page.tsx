"use client";

import { useState } from "react";
import { MonitorSmartphone, Plus, Car, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageState } from "@/components/ui/page-state";
import { useBranchDevices, useRegisterBranchDevice } from "@/lib/hooks/use-branch";
import { cn } from "@/lib/utils";
import type { DeviceProfile } from "@/lib/types/pos";

/**
 * The terminal registry (`POST/GET /v1/branch/devices`).
 *
 * Until a terminal is registered here, signing in on it answers
 * `unknown_device`. Registration uses the **branch manager's ordinary portal
 * token** — Admin always gets 403. Lives next to staff provisioning because
 * the same manager who creates cashiers commissions the tills they sign in on.
 */
export default function BranchDevicesPage() {
  const { data, isLoading, error } = useBranchDevices();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Terminals
          </h1>
          <p className="mt-1 text-sm text-muted">
            A till can only sign in once it&apos;s registered here.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          Register terminal
        </Button>
      </div>

      <PageState
        isLoading={isLoading}
        isError={!!error}
        data={data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load terminals"
        errorDescription={error instanceof Error ? error.message : undefined}
        emptyTitle="No terminals yet"
        emptyDescription="Register one using the Terminal ID shown on the till's setup screen."
      >
        {(rows) => (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Terminal ID</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Profile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="text-content">
                        {device.name || <span className="text-faint">—</span>}
                      </TableCell>
                      <TableCell>
                        {/* Matched exactly at POS login — monospaced so O/0 and I/l are clear. */}
                        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-content">
                          {device.device_uid}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted">{device.code}</TableCell>
                      <TableCell>
                        <Badge variant={device.profile === "CURBSIDE" ? "outline" : "secondary"}>
                          {device.profile === "CURBSIDE" ? (
                            <Car className="mr-1 size-3" aria-hidden />
                          ) : (
                            <Store className="mr-1 size-3" aria-hidden />
                          )}
                          {device.profile.toLowerCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageState>

      <RegisterDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

const PROFILES: Array<{ value: DeviceProfile; label: string; hint: string; icon: typeof Store }> = [
  {
    value: "COUNTER",
    label: "Counter",
    hint: "Has a cash drawer. Can take cash.",
    icon: Store,
  },
  {
    value: "CURBSIDE",
    label: "Curbside",
    hint: "No drawer. Cash is refused (device_cannot_take_cash).",
    icon: Car,
  },
];

function RegisterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const register = useRegisterBranchDevice();
  const [deviceUid, setDeviceUid] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<DeviceProfile>("COUNTER");

  const valid = deviceUid.trim().length >= 8 && code.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 text-brand" aria-hidden />
            Register a terminal
          </DialogTitle>
          <DialogDescription>
            Paste the Terminal ID from the till&apos;s setup screen. Same value at register and
            login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device_uid">Terminal ID</Label>
            <Input
              id="device_uid"
              autoFocus
              className="font-mono"
              placeholder="DEV-TERMINAL-01"
              value={deviceUid}
              onChange={(e) => setDeviceUid(e.target.value.trim())}
            />
            <p className="text-xs text-faint">
              The till generates this on first launch and reuses it forever. At least 8 characters;
              matched exactly at sign-in.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Receipt code</Label>
            <Input
              id="code"
              className="font-mono"
              placeholder="T1"
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
            />
            {/* order_no is {branch_code}-{terminal_code}-{seq}, so this ends up
                printed on every ticket. Short is better. Treat as permanent. */}
            <p className="text-xs text-faint">
              Appears in every order number, like{" "}
              <code className="text-content">BR0001-{code.trim() || "T1"}-A1B2C3D4</code>. Unique
              per restaurant — treat as permanent.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Front till"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-faint">For your reference only. Optional.</p>
          </div>

          <div className="space-y-2">
            <Label>Profile</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROFILES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProfile(p.value)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    profile === p.value
                      ? "border-brand bg-brand/10"
                      : "border-line bg-surface hover:border-brand/50",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-content">
                    <p.icon className="size-3.5" aria-hidden />
                    {p.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-faint">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || register.isPending}
            onClick={() =>
              register.mutate(
                {
                  device_uid: deviceUid.trim(),
                  code: code.trim(),
                  profile,
                  name: name.trim() || undefined,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setDeviceUid("");
                    setCode("");
                    setName("");
                    setProfile("COUNTER");
                  },
                },
              )
            }
          >
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
