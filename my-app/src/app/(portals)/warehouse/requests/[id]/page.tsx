"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WarehouseRequestDetail } from "@/components/warehouse/requests/WarehouseRequestDetail";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useWarehouseRequest } from "@/lib/hooks/use-warehouse-requests";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function WarehouseRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const request = useWarehouseRequest(params.id);

  const backLink = (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/warehouse/requests/po" aria-label="Back">
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
            Purchase order
          </h1>
          <p className="text-sm text-muted">
            Admin reviews this order before it can be received.
          </p>
        </div>
      </div>

      <WarehouseRequestDetail request={request.data} />
    </div>
  );
}
