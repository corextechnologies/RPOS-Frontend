"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState, EmptyState } from "@/components/ui/state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductionTarget } from "@/lib/types/production-target";

interface CompletedTargetsListProps {
  targets: ProductionTarget[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function CompletedTargetsList({
  targets,
  isLoading,
  isError,
  onRetry,
}: CompletedTargetsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState
            description="Couldn't load completed targets."
            onRetry={onRetry}
          />
        </CardContent>
      </Card>
    );
  }

  if (targets.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No targets to allocate"
            description="Completed production targets awaiting allocation will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {targets.map((target) => {
        const linesSummary =
          target.lines.length === 1
            ? target.lines[0].product_name
            : `${target.lines[0].product_name} +${target.lines.length - 1} more`;

        return (
          <li key={target.id}>
            <Link href={`/admin/requests/target/${target.id}`}>
              <Card className="transition hover:border-brand hover:shadow-soft">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                      <ClipboardCheck className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-content truncate">
                        {target.kitchen_name}
                      </p>
                      <p className="text-xs text-muted">
                        {target.target_date} · {linesSummary}
                      </p>
                    </div>
                  </div>
                  <ProductionTargetStatusBadge status={target.status} />
                </CardContent>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
