"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageState } from "@/components/ui/page-state";
import { PlanStatusBadge } from "@/components/forecast/PlanStatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranches } from "@/lib/hooks/use-locations";
import { useForecastPlans } from "@/lib/hooks/use-forecast-plans";
import type { ForecastPlanStatus, PlanFilters } from "@/lib/types/forecast";

const ALL = "all";
const STATUSES: ForecastPlanStatus[] = ["DRAFT", "CONFIRMED", "CANCELLED"];

/** Admin — plans list (§7). Newest first. Read/browse; the detail page ships them. */
export default function AdminPlansPage() {
  const router = useRouter();
  const branches = useBranches();
  const [status, setStatus] = useState<string>(ALL);
  const [branchId, setBranchId] = useState<string>(ALL);

  const filters: PlanFilters | undefined = useMemo(() => {
    const f: PlanFilters = {};
    if (status !== ALL) f.status = status as ForecastPlanStatus;
    if (branchId !== ALL) f.branch_id = branchId;
    return Object.keys(f).length ? f : undefined;
  }, [status, branchId]);

  const plans = useForecastPlans(filters);

  const branchName = useMemo(() => {
    const names = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
    return (id: number) => names.get(String(id)) ?? `Branch ${id}`;
  }, [branches.data]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/forecast"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Forecast
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-content">
          Plans
        </h1>
        <p className="mt-1 text-sm text-muted">
          Drafts you&apos;re still editing, and the plans you&apos;ve confirmed or cancelled.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All branches</SelectItem>
            {(branches.data ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PageState
        isLoading={plans.isLoading}
        isError={plans.isError}
        data={plans.data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load plans"
        errorDescription={plans.error instanceof Error ? plans.error.message : undefined}
        onRetry={() => plans.refetch()}
        emptyTitle="No plans yet"
        emptyDescription="Create one from the Forecast screen."
      >
        {(rows) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Overridden</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/forecast/plans/${plan.id}`)}
                  >
                    <TableCell className="font-medium text-content">
                      {branchName(plan.branch_id)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted">
                      {plan.starts_on} → {plan.ends_on}
                    </TableCell>
                    <TableCell>
                      <PlanStatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted">
                      {plan.lines.length}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted">
                      {plan.overridden_lines}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted">
                      {plan.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageState>
    </div>
  );
}
