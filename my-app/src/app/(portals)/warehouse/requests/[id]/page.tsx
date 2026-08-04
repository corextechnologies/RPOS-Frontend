"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WarehouseRequestActionPanel } from "@/components/warehouse/requests/WarehouseRequestActionPanel";
import { WarehouseRequestDetail } from "@/components/warehouse/requests/WarehouseRequestDetail";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import {
  useUpdateWarehouseRequestStatus,
  useWarehouseRequest,
} from "@/lib/hooks/use-warehouse-requests";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function WarehouseRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const request = useWarehouseRequest(params.id);
  const updateStatus = useUpdateWarehouseRequestStatus(params.id);

  const requestType = request.data?.request_type;
  const isPo = requestType === "WAREHOUSE_TO_ADMIN_PO";
  const isBranch = requestType === "BRANCH_TO_ADMIN";
  const backHref = isPo
    ? "/warehouse/requests/po"
    : isBranch
      ? "/warehouse/requests/branch"
      : "/warehouse/requests/kitchen";

  const backLink = (
    <Button variant="ghost" size="icon" asChild>
      <Link href={backHref} aria-label="Back">
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );

  if (isMissingWarehouseAssignment(request.error)) {
    return (
      <div className="space-y-6">
        {backLink}
        <WarehouseUnassigned />
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

  if (request.isError || !request.data) {
    return (
      <div className="space-y-6">
        {backLink}
        <ErrorState
          title="Request not found"
          description="This request is missing, or it is not visible to your warehouse."
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
            {isPo ? "Purchase order" : isBranch ? "Branch request" : "Kitchen request"}
          </h1>
          <p className="text-sm text-muted">
            {isPo
              ? "Admin reviews this order before it can be received."
              : "Approve, then dispatch from your stock."}
          </p>
        </div>
      </div>

      <WarehouseRequestDetail request={request.data} />

      <WarehouseRequestActionPanel
        request={request.data}
        canUpdate={can("requests:update")}
        isSubmitting={updateStatus.isPending}
        onSubmit={async (body) => {
          await updateStatus.mutateAsync(body);
        }}
      />
    </div>
  );
}
