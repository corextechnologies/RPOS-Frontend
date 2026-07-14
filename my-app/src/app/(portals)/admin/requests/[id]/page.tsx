"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RequestActionPanel } from "@/components/admin/requests/RequestActionPanel";
import { RequestDetail } from "@/components/admin/requests/RequestDetail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import { useRequest, useUpdateRequestStatus } from "@/lib/hooks/use-requests";

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { can } = useAuth();
  const request = useRequest(id);
  const updateStatus = useUpdateRequestStatus(id);

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
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/requests" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Request not found"
          description="This request is missing, or it is not visible to Admin."
          onRetry={() => request.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/requests" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Request
          </h1>
          <p className="text-sm text-muted">Review and act on this request.</p>
        </div>
      </div>

      <RequestDetail request={request.data} />

      <RequestActionPanel
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
