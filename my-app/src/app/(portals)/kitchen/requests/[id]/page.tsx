"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { KitchenRequestActionPanel } from "@/components/kitchen/requests/KitchenRequestActionPanel";
import { KitchenRequestDetail } from "@/components/kitchen/requests/KitchenRequestDetail";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import {
  useKitchenRequest,
  useUpdateKitchenRequestStatus,
} from "@/lib/hooks/use-kitchen-requests";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function KitchenRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const request = useKitchenRequest(params.id);
  const updateStatus = useUpdateKitchenRequestStatus(params.id);

  const isWarehouseRequest =
    request.data?.request_type === "KITCHEN_TO_WAREHOUSE";
  const backHref = isWarehouseRequest
    ? "/kitchen/requests/warehouse"
    : "/kitchen/requests/branch";

  const backLink = (
    <Button variant="ghost" size="icon" asChild>
      <Link href={backHref} aria-label="Back">
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );

  if (isMissingKitchenAssignment(request.error)) {
    return (
      <div className="space-y-6">
        {backLink}
        <KitchenUnassigned />
      </div>
    );
  }

  if (request.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // A 404 here means "not routed to your kitchen" as often as it means "gone" —
  // the API does not distinguish, so neither can this copy.
  if (request.isError || !request.data) {
    return (
      <div className="space-y-6">
        {backLink}
        <ErrorState
          title="Request not available"
          description="This request is missing, or it is not routed to your kitchen."
          onRetry={() => request.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {backLink}
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            {isWarehouseRequest ? "Warehouse request" : "Branch request"}
          </h1>
          <p className="text-sm text-muted">
            {isWarehouseRequest
              ? "Confirm receipt once the warehouse dispatches."
              : "Produce the approved quantities, then allocate to the branch."}
          </p>
        </div>
      </div>

      <KitchenRequestDetail request={request.data} />

      <KitchenRequestActionPanel
        // Remount on any status change so a part-filled action cannot outlive
        // the status it was started against.
        key={`${request.data.id}-${request.data.status}`}
        request={request.data}
        canUpdate={can("kitchen-requests:update")}
        isSubmitting={updateStatus.isPending}
        onSubmit={async (body) => {
          await updateStatus.mutateAsync(body);
        }}
      />
    </div>
  );
}
