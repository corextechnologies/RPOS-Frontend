"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useKitchenProductionTargets } from "@/lib/hooks/use-production-targets";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import type { KitchenProductionTargetFilters } from "@/lib/types/production-target";

export default function KitchenProductionTargetsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const allowed = can("kitchen-production-targets:read");
  const [date, setDate] = useState("");

  const filters: KitchenProductionTargetFilters | undefined = useMemo(
    () => (date ? { date } : undefined),
    [date],
  );

  const { data, isLoading, isError, error, refetch } = useKitchenProductionTargets(
    filters,
    allowed,
  );
  const unassigned = isMissingKitchenAssignment(error);
  const targets = (data ?? []).filter(
    (t) => t.status === "PENDING" || t.status === "ACKNOWLEDGED" || t.status === "IN_PRODUCTION",
  );

  if (!allowed) return <KitchenNoAccess />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Production targets
        </h1>
        <p className="mt-1 text-sm text-muted">
          What Admin has asked this kitchen to make. Acknowledge, produce, and
          complete &mdash; completed targets move to Dispatch to Admin.
        </p>
      </div>

      {unassigned ? (
        <KitchenUnassigned />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="date"
              className="w-44"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Filter by date"
            />
          </div>

          <PageState
            isLoading={isLoading}
            isError={isError}
            data={targets}
            isEmpty={(rows) => rows.length === 0}
            errorTitle="Couldn't load targets"
            errorDescription={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
            emptyTitle={date ? "No targets for this date" : "No production targets yet"}
            emptyDescription={
              date
                ? "Try a different date."
                : "Targets Admin sets for your kitchen will appear here."
            }
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
                          router.push(`/kitchen/production-targets/${t.id}`)
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
        </>
      )}
    </div>
  );
}
