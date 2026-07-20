"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { KitchenRequestDetail } from "@/components/kitchen/requests/KitchenRequestDetail";
import { KitchenDispatchDetail } from "@/components/kitchen/requests/KitchenDispatchDetail";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import { useKitchenDispatchRequests } from "@/lib/hooks/use-kitchen-requests";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

/**
 * Dispatch requests have no by-id endpoint on the API, so this detail reads the
 * kitchen's dispatch list and finds the row — one broad page covers a kitchen's
 * own notifications. Everything else mirrors the shared request detail.
 */
export default function KitchenDispatchDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const list = useKitchenDispatchRequests({ status: "all", page: 1, page_size: 100 });
  const request = list.data?.items.find((r) => r.id === params.id);

  const backLink = (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/kitchen/requests/dispatch" aria-label="Back">
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );

  if (isMissingKitchenAssignment(list.error)) {
    return (
      <div className="space-y-6">
        {backLink}
        <KitchenUnassigned />
      </div>
    );
  }

  if (list.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (list.isError || !request) {
    return (
      <div className="space-y-6">
        {backLink}
        <ErrorState
          title="Dispatch not available"
          description="This dispatch request is missing, or it is not one of yours."
          onRetry={() => list.refetch()}
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
            Dispatch to branches
          </h1>
          <p className="text-sm text-muted">
            Send the allocated quantities out to each branch.
          </p>
        </div>
      </div>

      <KitchenRequestDetail request={request} />

      <KitchenDispatchDetail request={request} canUpdate={can("kitchen-requests:update")} />
    </div>
  );
}
