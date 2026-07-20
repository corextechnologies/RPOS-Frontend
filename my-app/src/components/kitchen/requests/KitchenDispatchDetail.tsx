"use client";

import { useMemo, useState } from "react";
import { Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KitchenStatusBadge } from "@/components/kitchen/requests/KitchenStatusBadge";
import { useDispatchKitchenRequest } from "@/lib/hooks/use-kitchen-requests";
import type { AllocationStatus } from "@/lib/types/admin";
import type { KitchenRequest } from "@/lib/types/kitchen";
import { formatDate } from "@/lib/utils";

const ALLOC_LABEL: Record<AllocationStatus, string> = {
  ALLOCATED: "Allocated",
  DISPATCHED: "Dispatched",
  RECEIVED: "Received",
};

function allocBadge(status: AllocationStatus) {
  const variant =
    status === "RECEIVED" ? "success" : status === "DISPATCHED" ? "warning" : "secondary";
  return <Badge variant={variant}>{ALLOC_LABEL[status]}</Badge>;
}

/**
 * The head chef's view of a dispatch request Admin has allocated. Shows the
 * per-branch split and, while it's ALLOCATED, the one action that matters:
 * dispatch — which sends the goods out of the kitchen. After that it's a
 * read-only picture of which branches have confirmed receipt.
 */
export function KitchenDispatchDetail({
  request,
  canUpdate,
}: {
  request: KitchenRequest;
  canUpdate: boolean;
}) {
  const dispatch = useDispatchKitchenRequest(request.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Group allocations by branch for a per-branch reading.
  const byBranch = useMemo(() => {
    const map = new Map<
      string,
      { branch_name: string; lines: KitchenRequest["allocations"] }
    >();
    for (const a of request.allocations ?? []) {
      const entry = map.get(a.branch_id) ?? { branch_name: a.branch_name, lines: [] };
      entry.lines!.push(a);
      map.set(a.branch_id, entry);
    }
    return [...map.values()];
  }, [request.allocations]);

  const status = request.status;
  const isAllocated = status === "ALLOCATED";
  const hasAllocations = byBranch.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4 text-brand" aria-hidden />
                Dispatch
              </CardTitle>
              <CardDescription>
                {status === "PENDING"
                  ? "Waiting on Admin to allocate this across branches."
                  : isAllocated
                    ? "Allocated. Dispatch to send the goods out of the kitchen."
                    : status === "DISPATCHED"
                      ? "Dispatched. Waiting for branches to confirm receipt."
                      : status === "RECEIVED"
                        ? "All branches have received their goods."
                        : "This request was rejected."}
              </CardDescription>
            </div>
            <KitchenStatusBadge status={status} />
          </div>
        </CardHeader>

        {hasAllocations && (
          <CardContent className="space-y-3">
            {byBranch.map((branch) => (
              <div
                key={branch.branch_name}
                className="rounded-xl border border-line bg-surface-2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-content">{branch.branch_name}</p>
                  {branch.lines && branch.lines[0] && allocBadge(branch.lines[0].status)}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {(branch.lines ?? []).map((a) => (
                    <li key={a.id} className="flex justify-between text-sm">
                      <span className="text-muted">{a.product_name}</span>
                      <span className="tabular-nums text-content">{a.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <p className="text-xs text-faint">Updated {formatDate(request.updated_at ?? request.created_at)}</p>

            {isAllocated && canUpdate && (
              <div className="flex justify-end pt-1">
                <Button disabled={dispatch.isPending} onClick={() => setConfirmOpen(true)}>
                  <Truck className="mr-1.5 size-4" aria-hidden />
                  Dispatch to branches
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Dispatch to branches?"
        description="This sends the allocated quantities out of the kitchen and removes them from kitchen stock. Each branch then confirms receipt on its side."
        confirmLabel="Dispatch"
        loading={dispatch.isPending}
        onConfirm={async () => {
          await dispatch.mutateAsync();
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
