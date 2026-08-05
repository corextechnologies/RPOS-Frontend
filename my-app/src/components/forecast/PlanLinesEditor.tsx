"use client";

import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MaturityBadge } from "@/components/forecast/MaturityBadge";
import { useOverridePlanLines } from "@/lib/hooks/use-forecast-plans";
import { multiplierLabel, trimDecimal, isNeutralMultiplier } from "@/lib/forecast/format";
import type { ForecastPlan, PlanLine } from "@/lib/types/forecast";

interface Draft {
  planned: string;
  reason: string;
}

/**
 * The plan's line table (§7). Suggested and planned start equal — accepting is
 * the default, overriding the exception — so the Admin has to *disagree*, not
 * agree. `suggested_units` stays visible next to an override (§12.4). Editable
 * only while the plan is a DRAFT; a confirmed/cancelled plan is read-only.
 */
export function PlanLinesEditor({ plan }: { plan: ForecastPlan }) {
  const editable = plan.status === "DRAFT";
  const override = useOverridePlanLines(plan.id);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const valueFor = (line: PlanLine): Draft => ({
    planned: drafts[line.id]?.planned ?? String(line.planned_units),
    reason: drafts[line.id]?.reason ?? line.override_reason ?? "",
  });

  const set = (line: PlanLine, patch: Partial<Draft>) =>
    setDrafts((prev) => ({
      ...prev,
      [line.id]: { ...valueFor(line), ...patch },
    }));

  // A changed line: planned differs, or a reason was added/changed.
  const changed = useMemo(() => {
    return plan.lines.filter((line) => {
      const d = drafts[line.id];
      if (!d) return false;
      const plannedChanged = d.planned !== String(line.planned_units);
      const reasonChanged = (d.reason ?? "") !== (line.override_reason ?? "");
      return plannedChanged || reasonChanged;
    });
  }, [drafts, plan.lines]);

  const invalid = changed.some((line) => {
    const n = Number(drafts[line.id]?.planned);
    return !Number.isInteger(n) || n < 0;
  });

  const save = () => {
    if (invalid || changed.length === 0) return;
    override.mutate(
      {
        lines: changed.map((line) => ({
          line_id: line.id,
          planned_units: Number(drafts[line.id].planned),
          reason: drafts[line.id].reason.trim() || undefined,
        })),
      },
      { onSuccess: () => setDrafts({}) },
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Suggested</TableHead>
            <TableHead className="text-right">Planned</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.lines.map((line) => {
            const v = valueFor(line);
            const overridden = v.planned !== String(line.suggested_units);
            return (
              <TableRow key={line.id}>
                <TableCell className="tabular-nums text-muted">{line.date}</TableCell>
                <TableCell className="text-content">{line.product_name}</TableCell>
                <TableCell className="text-right tabular-nums text-muted">
                  {line.suggested_units}
                </TableCell>
                <TableCell className="text-right">
                  {editable ? (
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="ml-auto h-8 w-20 text-right tabular-nums"
                      value={v.planned}
                      onChange={(e) => set(line, { planned: e.target.value })}
                    />
                  ) : (
                    <span
                      className={
                        overridden
                          ? "font-medium tabular-nums text-brand"
                          : "tabular-nums text-content"
                      }
                    >
                      {line.planned_units}
                    </span>
                  )}
                </TableCell>
                <TableCell className="min-w-[12rem]">
                  {editable ? (
                    <Input
                      className="h-8"
                      placeholder={overridden ? "Why the change?" : ""}
                      value={v.reason}
                      onChange={(e) => set(line, { reason: e.target.value })}
                    />
                  ) : (
                    <span className="text-sm text-muted">{line.override_reason ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <MaturityBadge maturity={line.breakdown.maturity} />
                    {line.breakdown.was_capped && (
                      <Badge variant="destructive" title="Suggestion was capped to a sane range">
                        <TriangleAlert className="mr-1 size-3" aria-hidden />
                        Capped
                      </Badge>
                    )}
                    {!isNeutralMultiplier(line.breakdown.event_multiplier) && (
                      <span className="text-xs tabular-nums text-muted">
                        {multiplierLabel(line.breakdown.event_multiplier)} event
                      </span>
                    )}
                    <span className="sr-only">
                      baseline {trimDecimal(line.breakdown.baseline)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editable && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-sm text-muted">
            {changed.length === 0
              ? "Accepting every suggestion. Edit any line you disagree with."
              : `${changed.length} line${changed.length === 1 ? "" : "s"} changed.`}
            {invalid && (
              <span className="ml-2 text-danger">Planned units must be a whole number ≥ 0.</span>
            )}
          </p>
          <Button
            onClick={save}
            disabled={changed.length === 0 || invalid || override.isPending}
          >
            {override.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
