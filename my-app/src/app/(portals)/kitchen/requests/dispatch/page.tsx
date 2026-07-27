"use client";

import { useRouter } from "next/navigation";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import { PageState } from "@/components/ui/page-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompletedKitchenProductionTargets } from "@/lib/hooks/use-production-targets";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

/**
 * Dispatch to Admin — completed production targets the kitchen hands off to
 * Admin, who allocates them across branches, then the kitchen dispatches. This
 * is the kitchen's single "ready to go out" queue; branch refills dispatch
 * straight to the branch from the Branch requests screen instead.
 */
export default function KitchenDispatchRequestsPage() {
  const router = useRouter();
  const completedTargets = useCompletedKitchenProductionTargets();
  const unassigned = isMissingKitchenAssignment(completedTargets.error);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Dispatch to Admin
        </h1>
        <p className="mt-1 text-sm text-muted">
          Completed production targets — waiting on Admin to allocate, then dispatch to
          branches.
        </p>
      </div>

      {unassigned ? (
        <KitchenUnassigned />
      ) : (
        <PageState
          isLoading={completedTargets.isLoading}
          isError={completedTargets.isError}
          data={completedTargets.data}
          isEmpty={(rows) => rows.length === 0}
          errorTitle="Couldn't load targets"
          onRetry={() => completedTargets.refetch()}
          emptyTitle="No completed targets"
          emptyDescription="Targets move here once you complete production and notify Admin."
        >
          {(rows) => (
            <div className="rounded-2xl border border-line bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/kitchen/requests/dispatch/target/${t.id}`)
                      }
                    >
                      <TableCell className="font-medium tabular-nums text-content">
                        {t.target_date}
                      </TableCell>
                      <TableCell>
                        <ProductionTargetStatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted">
                        {t.lines.length}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted">
                        {t.note ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageState>
      )}
    </div>
  );
}
