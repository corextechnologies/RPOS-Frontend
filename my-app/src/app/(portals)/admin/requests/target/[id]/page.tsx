"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductionTargetAllocationPanel } from "@/components/production-targets/ProductionTargetAllocationPanel";
import { ProductionTargetDetail } from "@/components/production-targets/ProductionTargetDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import { useProductionTarget } from "@/lib/hooks/use-production-targets";

export default function AdminTargetAllocationPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useProductionTarget(params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/requests" aria-label="Back to requests">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Allocate production target
          </h1>
          <p className="text-sm text-muted">
            {data ? `${data.kitchen_name} · ${data.target_date}` : "Loading…"}
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

          {data.status === "COMPLETED" && can("production-targets:update") ? (
            <ProductionTargetAllocationPanel target={data} />
          ) : (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted">
                  {data.status === "ALLOCATED"
                    ? "Already allocated. The kitchen dispatches next."
                    : data.status === "DISPATCHED"
                      ? "Dispatched to the branches."
                      : data.status === "RECEIVED"
                        ? "Every branch has received this target."
                        : "This target is not ready to allocate yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
