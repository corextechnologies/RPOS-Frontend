"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubKitchenStats } from "@/lib/hooks/use-sub-kitchen";
import { prepStatusLabel } from "@/lib/sub-kitchen/prep-transitions";
import { formatDate } from "@/lib/utils";
import type { PrepStatus } from "@/lib/types/sub-kitchen";

const PERIODS = [7, 14, 30] as const;
const STATUS_ORDER: PrepStatus[] = [
  "QUEUED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

/** Window start as `YYYY-MM-DD`, `days` back inclusive of today. */
const startNDaysAgo = (days: number) =>
  new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

/** Seconds → whole minutes; null (no order-sourced tickets yet) renders as a dash. */
function avgLabel(seconds: number | null): string {
  if (seconds == null) return "—";
  return `${Math.round(seconds / 60)} min`;
}

function Stat({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <p className="font-display text-3xl font-semibold tabular-nums text-content">{value}</p>
        )}
        {hint && !loading && <p className="mt-1 text-xs text-faint">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * The station's numbers over a window. Read-only by nature, which is why the
 * Sub-kitchen portal and the Branch portal's watch tab can share it verbatim.
 */
export function SubKitchenStatsPanel() {
  const [days, setDays] = useState(7);
  const filters = useMemo(() => ({ start: startNDaysAgo(days) }), [days]);
  const stats = useSubKitchenStats(filters);
  const s = stats.data;

  if (stats.isError) {
    return (
      <ErrorState
        title="Couldn't load the overview"
        description={stats.error instanceof Error ? stats.error.message : undefined}
        onRetry={() => stats.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {s ? `${formatDate(s.start)} – ${formatDate(s.end)}` : `Last ${days} days`}
        </p>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={String(p)}>
                Last {p} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Items prepped" value={s?.items_prepped ?? 0} loading={stats.isLoading} />
        <Stat
          label="Tickets completed"
          value={s?.tickets_completed ?? 0}
          loading={stats.isLoading}
        />
        <Stat
          label="Open tickets"
          value={s?.open_tickets ?? 0}
          hint="Right now"
          loading={stats.isLoading}
        />
        <Stat label="Waste events" value={s?.waste_events ?? 0} loading={stats.isLoading} />
        <Stat
          label="Waste written off"
          value={s?.waste_quantity ?? 0}
          hint="units"
          loading={stats.isLoading}
        />
        <Stat
          label="Avg order → ready"
          value={avgLabel(s?.avg_order_to_ready_seconds ?? null)}
          hint={s && s.avg_order_to_ready_seconds == null ? "No order timings yet" : undefined}
          loading={stats.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets created</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {STATUS_ORDER.map((status) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted">{prepStatusLabel(status)}</span>
                <span className="tabular-nums text-content">
                  {stats.isLoading ? "—" : (s?.tickets_created[status] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
