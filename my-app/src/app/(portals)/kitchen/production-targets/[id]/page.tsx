"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, CircleCheck } from "lucide-react";
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
  useAcknowledgeProductionTarget,
  useCompleteProductionTarget,
  useKitchenProductionTarget,
} from "@/lib/hooks/use-production-targets";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function KitchenProductionTargetDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const allowed = can("kitchen-production-targets:read");
  const canUpdate = can("kitchen-production-targets:update");

  const { data, isLoading, isError, error, refetch } = useKitchenProductionTarget(
    allowed ? params.id : null,
  );
  const acknowledge = useAcknowledgeProductionTarget();
  const complete = useCompleteProductionTarget();
  const [confirmComplete, setConfirmComplete] = useState(false);

  if (!allowed) return <KitchenNoAccess />;
  if (isMissingKitchenAssignment(error)) return <KitchenUnassigned />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kitchen/production-targets" aria-label="Back">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production target
          </h1>
          <p className="text-sm text-muted">
            {data ? data.target_date : "Loading…"}
          </p>
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

          {canUpdate && data.status === "PENDING" && (
            <Card>
              <CardHeader>
                <CardTitle>Acknowledge</CardTitle>
                <CardDescription>
                  Confirm the kitchen has seen this target and will make it. Admin is
                  notified.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => acknowledge.mutate(data.id)}
                  disabled={acknowledge.isPending}
                >
                  <Check className="mr-1.5 size-4" aria-hidden />
                  Acknowledge target
                </Button>
              </CardContent>
            </Card>
          )}

          {canUpdate && data.status === "ACKNOWLEDGED" && (
            <Card>
              <CardHeader>
                <CardTitle>Mark complete</CardTitle>
                <CardDescription>
                  Mark this target as made. Admin is notified. This can&apos;t be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setConfirmComplete(true)}
                  disabled={complete.isPending}
                >
                  <CircleCheck className="mr-1.5 size-4" aria-hidden />
                  Mark complete
                </Button>
              </CardContent>
            </Card>
          )}

          {data.status === "COMPLETED" && (
            <p className="text-sm text-muted">This target is complete.</p>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="Mark this target complete?"
        description="This tells Admin the target has been made. It can't be undone."
        confirmLabel="Mark complete"
        loading={complete.isPending}
        onConfirm={async () => {
          try {
            if (data) await complete.mutateAsync(data.id);
            setConfirmComplete(false);
          } catch {
            setConfirmComplete(false);
          }
        }}
      />
    </div>
  );
}
