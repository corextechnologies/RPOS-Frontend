"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { ProductionTargetAllocationPanel } from "@/components/production-targets/ProductionTargetAllocationPanel";
import { ProductionTargetDetail } from "@/components/production-targets/ProductionTargetDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import {
  useDeleteProductionTarget,
  useProductionTarget,
} from "@/lib/hooks/use-production-targets";
import type { ProductionTargetStatus } from "@/lib/types/production-target";

/** What Admin is waiting on, once a target has left PENDING but isn't allocatable. */
function allocationHint(status: ProductionTargetStatus): string {
  switch (status) {
    case "ACKNOWLEDGED":
      return "The kitchen has acknowledged this target and will start production.";
    case "IN_PRODUCTION":
      return "The kitchen is producing this target. Allocate it across branches once it's complete.";
    case "ALLOCATED":
      return "Allocated across branches. The kitchen dispatches next.";
    case "DISPATCHED":
      return "Dispatched to the branches. They confirm receipt on their Incoming screen.";
    case "RECEIVED":
      return "Every branch has received this target. It's complete.";
    default:
      return "This target can no longer be edited or deleted.";
  }
}

export default function AdminProductionTargetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useProductionTarget(params.id);
  const remove = useDeleteProductionTarget();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editable = data?.status === "PENDING";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/production-targets" aria-label="Back">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production target
          </h1>
          <p className="text-sm text-muted">
            {data ? `${data.kitchen_name} · ${data.target_date}` : "Loading…"}
          </p>
        </div>
        {editable && (
          <div className="flex gap-2">
            {can("production-targets:update") && (
              <Button variant="outline" asChild>
                <Link href={`/admin/production-targets/${params.id}/edit`}>
                  <Pencil className="mr-1.5 size-4" aria-hidden />
                  Edit
                </Link>
              </Button>
            )}
            {can("production-targets:delete") && (
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="mr-1.5 size-4 text-danger" aria-hidden />
                Delete
              </Button>
            )}
          </div>
        )}
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

          {data.status === "COMPLETED" && can("production-targets:update") && (
            <ProductionTargetAllocationPanel target={data} />
          )}

          {!editable && data.status !== "COMPLETED" && (
            <p className="text-sm text-muted">
              {allocationHint(data.status)}
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this target?"
        description="The kitchen will no longer see it. This cannot be undone."
        confirmLabel="Delete target"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(params.id);
            setConfirmDelete(false);
            router.push("/admin/production-targets");
          } catch {
            setConfirmDelete(false);
          }
        }}
      />
    </div>
  );
}
