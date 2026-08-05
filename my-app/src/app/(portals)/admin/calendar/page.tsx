"use client";

import { useState } from "react";
import { CalendarCheck, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/ui/page-state";
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
import { EventEditorDialog } from "@/components/calendar/EventEditorDialog";
import { GenerateYearDialog } from "@/components/calendar/GenerateYearDialog";
import { ProductMultipliersDialog } from "@/components/calendar/ProductMultipliersDialog";
import { formatTag } from "@/components/calendar/EventMultipliersField";
import { useBranches } from "@/lib/hooks/use-locations";
import { useCalendarEvents, useDeleteEvent, useUpdateEvent } from "@/lib/hooks/use-calendar";
import { multiplierLabel, trimDecimal, type BadgeVariant } from "@/lib/forecast/format";
import type { CalendarEvent, EventSource } from "@/lib/types/forecast";

const SOURCE_LABEL: Record<EventSource, string> = {
  FIXED: "Holiday",
  LUNAR: "Lunar",
  MANUAL: "Manual",
};
const SOURCE_VARIANT: Record<EventSource, BadgeVariant> = {
  FIXED: "secondary",
  LUNAR: "default",
  MANUAL: "outline",
};

const CURRENT_YEAR = new Date().getFullYear();

export default function AdminCalendarPage() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const events = useCalendarEvents({
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  });
  // Proactively nudge when the COMING year has nothing yet (§3c), so next
  // year's Ramadan/Eids/holidays get set up before anyone needs them.
  const nextYear = CURRENT_YEAR + 1;
  const nextYearEvents = useCalendarEvents({
    start: `${nextYear}-01-01`,
    end: `${nextYear}-12-31`,
  });
  const nudgeNextYear =
    !nextYearEvents.isLoading &&
    (nextYearEvents.data?.length ?? 0) === 0 &&
    Number(year) !== nextYear;
  const branches = useBranches();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [multipliersFor, setMultipliersFor] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setEditorOpen(true);
  };

  const years = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Event Calendar
          </h1>
          <p className="mt-1 text-sm text-muted">
            Ramadan, Eid, holidays and anything you add — and what each does to demand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateYearDialog defaultYear={CURRENT_YEAR} />
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 size-4" aria-hidden />
            Add event
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {nudgeNextYear && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-content">
            {nextYear} has no events yet — set it up so next year&apos;s Ramadan, Eids and
            holidays are ready.
          </p>
          <Button variant="outline" size="sm" onClick={() => setYear(String(nextYear))}>
            Set up {nextYear}
          </Button>
        </div>
      )}

      <PageState
        isLoading={events.isLoading}
        isError={events.isError}
        data={events.data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load the calendar"
        errorDescription={events.error instanceof Error ? events.error.message : undefined}
        onRetry={() => events.refetch()}
        emptyTitle={`No events for ${year}`}
        emptyDescription="Use “Generate year” to create the holidays and lunar events, or add your own."
      >
        {(rows) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Weekday</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Lifts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-content">{event.name}</span>
                        <Badge variant={SOURCE_VARIANT[event.source]}>
                          {SOURCE_LABEL[event.source]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted">
                      <div className="flex items-center gap-2">
                        <span>
                          {event.starts_on}
                          {event.ends_on !== event.starts_on ? ` → ${event.ends_on}` : ""}
                        </span>
                        {event.is_estimated && (
                          <Badge variant="warning" title="Confirm when the date is announced">
                            Estimated
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted" title="Weekday dial">
                      {trimDecimal(event.weekly_factor_weight)}
                    </TableCell>
                    <TableCell className="text-muted">
                      {event.branch_id == null
                        ? "Whole restaurant"
                        : branchName(branches.data, event.branch_id)}
                    </TableCell>
                    <TableCell>
                      <MultiplierChips event={event} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {event.source === "LUNAR" && event.is_estimated && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateEvent.isPending}
                            onClick={() =>
                              updateEvent.mutate({ eventId: event.id, input: { confirm: true } })
                            }
                          >
                            <CalendarCheck className="mr-1 size-3.5" aria-hidden />
                            Confirm dates
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => setMultipliersFor(event)}
                          aria-label="Per-product multipliers"
                          title="Per-product multipliers"
                        >
                          <Package className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => openEdit(event)}
                          aria-label="Edit event"
                          title="Edit"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        {event.source === "MANUAL" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-danger"
                            onClick={() => setDeleteTarget(event)}
                            aria-label="Delete event"
                            title="Delete"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageState>

      <EventEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        event={editing}
        branches={branches.data ?? []}
      />

      {multipliersFor && (
        <ProductMultipliersDialog
          open={!!multipliersFor}
          onOpenChange={(o) => !o && setMultipliersFor(null)}
          event={multipliersFor}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "event"}?`}
        description="This one-off event will be removed. Built-in holidays can't be deleted — set their multipliers to 1 instead."
        confirmLabel="Delete"
        destructive
        loading={deleteEvent.isPending}
        onConfirm={async () => {
          if (deleteTarget) await deleteEvent.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function MultiplierChips({ event }: { event: CalendarEvent }) {
  if (event.multipliers.length === 0) {
    return <span className="text-sm text-faint">—</span>;
  }
  const shown = event.multipliers.slice(0, 3);
  const extra = event.multipliers.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((m) => (
        <Badge key={m.tag} variant="secondary">
          {formatTag(m.tag)} {multiplierLabel(m.multiplier)}
        </Badge>
      ))}
      {extra > 0 && <Badge variant="outline">+{extra}</Badge>}
    </div>
  );
}

function branchName(
  branches: { id: string; name: string }[] | undefined,
  branchId: number,
): string {
  return branches?.find((b) => b.id === String(branchId))?.name ?? `Branch ${branchId}`;
}
