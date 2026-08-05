"use client";

import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUpcomingEvents } from "@/lib/hooks/use-forecast";
import { multiplierLabel } from "@/lib/forecast/format";
import type { UpcomingEvent } from "@/lib/types/forecast";

/**
 * The alert strip at the top of the planning screen (§6 upcoming-events).
 * `impacts` is sorted biggest-first, so `impacts[0]` is the headline. Renders
 * nothing when there is nothing coming up.
 */
export function UpcomingEventsStrip({
  branchId,
  withinDays = 14,
}: {
  branchId?: string | number;
  withinDays?: number;
}) {
  const { data } = useUpcomingEvents(
    { branch_id: branchId || undefined, within_days: withinDays },
    true,
  );

  if (!data || data.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((event) => (
        <EventAlert key={event.event_id} event={event} />
      ))}
    </div>
  );
}

function EventAlert({ event }: { event: UpcomingEvent }) {
  const top = event.impacts[0];
  const when = event.in_progress
    ? "underway now"
    : event.days_away === 0
      ? "starts today"
      : `begins in ${event.days_away} day${event.days_away === 1 ? "" : "s"}`;

  return (
    <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-brand" aria-hidden />
          <span className="font-display text-sm font-semibold text-content">
            {event.name}
          </span>
        </div>
        {event.is_estimated && (
          <Badge variant="warning" title="Confirm when the date is announced">
            Estimated
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">
        {event.name} {when}
        {top
          ? ` — ${top.tag.replace(/_/g, " ").toLowerCase()} expected around ${multiplierLabel(top.multiplier)}.`
          : "."}
      </p>
      {event.impacts.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {event.impacts.slice(1).map((impact) => (
            <Badge key={impact.tag} variant="secondary">
              {impact.tag.replace(/_/g, " ").toLowerCase()} {multiplierLabel(impact.multiplier)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
