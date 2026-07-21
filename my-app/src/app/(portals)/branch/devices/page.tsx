"use client";

import { useState } from "react";
import {
  MonitorSmartphone,
  Plus,
  Car,
  Store,
  MoreHorizontal,
  RefreshCw,
  Ban,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageState } from "@/components/ui/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActivationCodeDialog } from "@/components/branch/ActivationCodeDialog";
import {
  useBranchDevices,
  useRegisterBranchDevice,
  useReissueBranchDevice,
  useRevokeBranchDevice,
} from "@/lib/hooks/use-branch";
import { cn } from "@/lib/utils";
import type { DeviceProfile, DeviceStatus, PosDevice, PosDeviceActivation } from "@/lib/types/pos";

/**
 * The terminal registry (`/v1/branch/devices`).
 *
 * A manager registers a terminal from their own device — they never type the
 * till's id. Registration mints a one-time **activation code** the physical
 * till claims to pair itself, the way a card reader or smart-TV app activates.
 * Uses the **branch manager's ordinary portal token** — Admin always gets 403.
 */
export default function BranchDevicesPage() {
  const { data, isLoading, error } = useBranchDevices();
  const [addOpen, setAddOpen] = useState(false);

  // The activation code returned by register/reissue — shown once, then dropped.
  const [activation, setActivation] = useState<PosDeviceActivation | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Terminals
          </h1>
          <p className="mt-1 text-sm text-muted">
            Register a till here, then pair the device with the activation code it shows.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          Add terminal
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
        emptyDescription="Add one, then enter its activation code on the till to pair it."
      >
        {(rows) => (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((device) => (
                    <DeviceRow key={device.id} device={device} onReissued={setActivation} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageState>

      <AddTerminalDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onRegistered={setActivation}
      />

      <ActivationCodeDialog
        device={activation}
        open={!!activation}
        onOpenChange={(open) => !open && setActivation(null)}
      />
    </div>
  );
}

// ---- Status ----

const STATUS_META: Record<
  DeviceStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  ACTIVE: { label: "Active", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  REVOKED: { label: "Revoked", variant: "secondary" },
};

function StatusBadge({ device }: { device: PosDevice }) {
  const meta = STATUS_META[device.status] ?? STATUS_META.PENDING;
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={meta.variant} className="w-fit">
        {meta.label}
      </Badge>
      {device.status === "PENDING" && device.has_outstanding_code && (
        <span className="text-xs text-faint">code issued — not yet paired</span>
      )}
    </div>
  );
}

// ---- Row ----

function DeviceRow({
  device,
  onReissued,
}: {
  device: PosDevice;
  onReissued: (activation: PosDeviceActivation) => void;
}) {
  const reissue = useReissueBranchDevice();
  const revoke = useRevokeBranchDevice();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const isRevoked = device.status === "REVOKED";

  return (
    <TableRow>
      <TableCell className="text-content">
        {device.name || <span className="text-faint">—</span>}
      </TableCell>
      <TableCell>
        {/* Printed on every ticket via order_no — monospaced so O/0 read clearly. */}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-content">
          {device.code}
        </code>
      </TableCell>
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
      <TableCell>
        <StatusBadge device={device} />
      </TableCell>
      <TableCell className="text-sm text-muted">{formatLastSeen(device.last_seen_at)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Actions for ${device.code}`}
              disabled={reissue.isPending || revoke.isPending}
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={isRevoked || reissue.isPending}
              onClick={() =>
                reissue.mutate(device.id, { onSuccess: (activation) => onReissued(activation) })
              }
            >
              <RefreshCw className="mr-2 size-4" aria-hidden />
              Reissue code
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isRevoked}
              onClick={() => setConfirmRevoke(true)}
              className="text-danger focus:text-danger"
            >
              <Ban className="mr-2 size-4" aria-hidden />
              Revoke
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ConfirmDialog
          open={confirmRevoke}
          onOpenChange={setConfirmRevoke}
          title={`Revoke ${device.code}?`}
          description="The till stops working immediately — its current session dies on the next action, not at sign-out. Pairing a replacement needs a fresh activation code."
          confirmLabel="Revoke terminal"
          destructive
          loading={revoke.isPending}
          onConfirm={() =>
            revoke.mutate(device.id, { onSuccess: () => setConfirmRevoke(false) })
          }
        />
      </TableCell>
    </TableRow>
  );
}

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return "-";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "-";
  return at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// ---- Add terminal ----

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
    hint: "Tablet, no drawer. Cash is refused.",
    icon: Car,
  },
];

function AddTerminalDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (activation: PosDeviceActivation) => void;
}) {
  const register = useRegisterBranchDevice();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<DeviceProfile>("COUNTER");

  const valid = code.trim().length > 0;

  const reset = () => {
    setCode("");
    setName("");
    setProfile("COUNTER");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 text-brand" aria-hidden />
            Add a terminal
          </DialogTitle>
          <DialogDescription>
            Register the till here. You&apos;ll get a one-time activation code to enter on the
            device itself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Receipt code</Label>
            <Input
              id="code"
              autoFocus
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
                { code: code.trim(), profile, name: name.trim() || undefined },
                {
                  onSuccess: (activation) => {
                    onOpenChange(false);
                    reset();
                    onRegistered(activation);
                  },
                },
              )
            }
          >
            {register.isPending ? "Adding…" : "Add terminal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
