"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { ProductionTargetDetail } from "@/components/production-targets/ProductionTargetDetail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import {
  useDispatchProductionTarget,
  useKitchenProductionTarget,
} from "@/lib/hooks/use-production-targets";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import type { ProductionTarget } from "@/lib/types/production-target";

export default function KitchenDispatchTargetDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const allowed = can("kitchen-production-targets:read");
  const canUpdate = can("kitchen-production-targets:update");

  const { data, isLoading, isError, error, refetch } = useKitchenProductionTarget(
    allowed ? params.id : null,
  );

  if (!allowed) return <KitchenNoAccess />;
  if (isMissingKitchenAssignment(error)) return <KitchenUnassigned />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kitchen/requests/dispatch" aria-label="Back">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production target dispatch
          </h1>
          <p className="text-sm text-muted">{data ? data.target_date : "Loading…"}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Couldn't load this target."
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <ProductionTargetDetail target={data} />
          {canUpdate && <DispatchActions target={data} />}
        </>
      )}
    </div>
  );
}

function DispatchActions({ target }: { target: ProductionTarget }) {
  const dispatch = useDispatchProductionTarget();
  const [confirmDispatch, setConfirmDispatch] = useState(false);

  switch (target.status) {
    case "COMPLETED":
      return (
        <Card>
          <CardHeader>
            <CardTitle>Waiting on Admin</CardTitle>
            <CardDescription>
              Production is complete. Admin allocates the produced quantities across
              branches — you&apos;ll dispatch once that&apos;s done.
            </CardDescription>
          </CardHeader>
        </Card>
      );

    case "ALLOCATED":
      return (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Dispatch to branches</CardTitle>
              <CardDescription>
                Ship the allocated quantities. Each branch then confirms receipt on its
                Incoming screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setConfirmDispatch(true)}
                disabled={dispatch.isPending}
              >
                <Truck className="mr-1.5 size-4" aria-hidden />
                Dispatch to branches
              </Button>
            </CardContent>
          </Card>
          <ConfirmDialog
            open={confirmDispatch}
            onOpenChange={setConfirmDispatch}
            title="Dispatch this target?"
            description="The allocated quantities are sent to each branch to receive. This can't be undone."
            confirmLabel="Dispatch"
            loading={dispatch.isPending}
            onConfirm={async () => {
              try {
                await dispatch.mutateAsync(target.id);
                setConfirmDispatch(false);
              } catch {
                setConfirmDispatch(false);
              }
            }}
          />
        </>
      );

    case "DISPATCHED":
      return (
        <Card>
          <CardHeader>
            <CardTitle>Dispatched</CardTitle>
            <CardDescription>
              On its way to the branches. Each confirms receipt on its Incoming screen;
              the target is done once all have.
            </CardDescription>
          </CardHeader>
        </Card>
      );

    case "RECEIVED":
      return (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted">
              Every branch has received this target.
            </p>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}
