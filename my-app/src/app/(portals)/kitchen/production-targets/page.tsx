"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { ProductionDateFilter } from "@/components/kitchen/ProductionDateFilter";
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
import { useAuth } from "@/lib/auth";
import { useKitchenProductionTargets } from "@/lib/hooks/use-production-targets";
import {
  DEFAULT_DATE_FILTER,
  isWithinRange,
  resolveDateRange,
  type DateFilterValue,
} from "@/lib/date-range";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function KitchenProductionTargetsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const allowed = can("kitchen-production-targets:read");
  // Same date dropdown as the Production screen — defaults to Today. Presets need
  // a range, so filtering is client-side by target_date rather than the
  // single-date server filter.
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const range = resolveDateRange(dateFilter);

  const { data, isLoading, isError, error, refetch } = useKitchenProductionTargets(
    undefined,
    allowed,
  );
  const unassigned = isMissingKitchenAssignment(error);
  const targets = (data ?? []).filter(
    (t) =>
      (t.status === "PENDING" ||
        t.status === "ACKNOWLEDGED" ||
        t.status === "IN_PRODUCTION") &&
      isWithinRange(t.target_date, range),
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
            <ProductionDateFilter value={dateFilter} onChange={setDateFilter} />
          </div>

          <PageState
            isLoading={isLoading}
            isError={isError}
            data={targets}
            isEmpty={(rows) => rows.length === 0}
            errorTitle="Couldn't load targets"
            errorDescription={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
            emptyTitle="No targets for this period"
            emptyDescription="Nothing was set for these dates. Try a wider range."
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
