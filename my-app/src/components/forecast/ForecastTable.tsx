"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MaturityBadge } from "@/components/forecast/MaturityBadge";
import { isNeutralMultiplier, multiplierLabel, trimDecimal } from "@/lib/forecast/format";
import type { ForecastEventRef, ForecastRow } from "@/lib/types/forecast";

/**
 * The main forecast table (§6). One row per product per day. Every field the
 * handoff flags is surfaced: the headline `suggested_units`, a `was_capped`
 * warning that shows both numbers (§6a), the maturity trust badge (§6b), the
 * product-vs-tag distinction on event chips, and the ready-to-render notes —
 * all one expand away so the table stays scannable.
 */
export function ForecastTable({ rows }: { rows: ForecastRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Suggested</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Events</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const key = `${row.date}-${row.product_id}`;
            const isOpen = expanded.has(key);
            const events = row.events.filter((e) => !isNeutralMultiplier(e.multiplier));
            return (
              <FragmentRow
                key={key}
                row={row}
                rowKey={key}
                isOpen={isOpen}
                events={events}
                onToggle={toggle}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FragmentRow({
  row,
  rowKey,
  isOpen,
  events,
  onToggle,
}: {
  row: ForecastRow;
  rowKey: string;
  isOpen: boolean;
  events: ForecastEventRef[];
  onToggle: (key: string) => void;
}) {
  const { breakdown, confidence } = row;

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => onToggle(rowKey)}>
        <TableCell className="text-muted">
          {isOpen ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
        </TableCell>
        <TableCell className="tabular-nums text-muted">{row.date}</TableCell>
        <TableCell className="text-content">{row.product_name}</TableCell>
        <TableCell className="text-right">
          <span
            className="font-medium tabular-nums text-content"
            title={`Exact: ${row.units}`}
          >
            {row.suggested_units}
          </span>
          {confidence.dates_estimated && (
            <span
              className="ml-0.5 text-warning"
              title="Some contributing event dates are unconfirmed"
            >
              *
            </span>
          )}
          {breakdown.was_capped && (
            <Badge
              variant="destructive"
              className="ml-2"
              title={`Adjusted from ${trimDecimal(breakdown.before_cap)} to stay within 0.3×–5× of baseline`}
            >
              <TriangleAlert className="mr-1 size-3" aria-hidden />
              Capped
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <MaturityBadge
            maturity={confidence.maturity}
            observedDays={confidence.observed_days}
            engine={confidence.engine}
          />
        </TableCell>
        <TableCell>
          {events.length === 0 ? (
            <span className="text-sm text-faint">—</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {events.map((e) => (
                <EventChip key={e.event_id} event={e} />
              ))}
            </div>
          )}
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow className="bg-surface-2/40 hover:bg-surface-2/40">
          <TableCell />
          <TableCell colSpan={5} className="py-4">
            <BreakdownDetail row={row} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** A "product" chip is the dish's own number; a "tag" chip is its category rule. */
function EventChip({ event }: { event: ForecastEventRef }) {
  const parts: string[] = [];
  if (event.is_estimated) parts.push("dates estimated");
  if (event.source === "product") parts.push("this product's own multiplier");
  else parts.push("from its category tag");
  if (event.is_proposed) parts.push("suggested — confirm");

  return (
    <Badge
      variant={event.is_proposed ? "outline" : event.source === "product" ? "default" : "secondary"}
      title={parts.join(" · ")}
    >
      {event.name} {multiplierLabel(event.multiplier)}
      {event.source === "product" ? " ·own" : ""}
      {event.is_estimated ? " *" : ""}
    </Badge>
  );
}

function BreakdownDetail({ row }: { row: ForecastRow }) {
  const { breakdown } = row;
  const weekdayReduced =
    trimDecimal(breakdown.weekday_factor) !== trimDecimal(breakdown.weekday_applied);

  return (
    <div className="space-y-3 px-2">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Figure label="Baseline" value={`${trimDecimal(breakdown.baseline)}/day`} />
        <Figure
          label="Weekday pattern"
          value={
            weekdayReduced
              ? `${trimDecimal(breakdown.weekday_factor)} → ${trimDecimal(breakdown.weekday_applied)}`
              : trimDecimal(breakdown.weekday_applied)
          }
          hint={weekdayReduced ? "Reduced because of an event on this day" : undefined}
        />
        {!isNeutral(breakdown.event_multiplier) && (
          <Figure label="Event multiplier" value={multiplierLabel(breakdown.event_multiplier)} />
        )}
        {/* Always surface the exact decimal — and, when capped, the pre-cap
            figure too, so neither number is ever dropped (§6a). */}
        <Figure label="Exact units" value={trimDecimal(row.units)} />
        {breakdown.was_capped && (
          <Figure
            label="Before cap"
            value={trimDecimal(breakdown.before_cap)}
            hint="Clipped to 0.3×–5× of baseline"
          />
        )}
      </div>

      {row.notes.length > 0 && (
        <ul className="list-inside list-disc space-y-0.5 text-sm text-muted">
          {row.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isNeutral(value: string): boolean {
  return Number(value) === 1;
}

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-faint">{label}</div>
      <div className="tabular-nums text-content">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}
