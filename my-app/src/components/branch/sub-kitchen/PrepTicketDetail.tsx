"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { PrepTicketSummary } from "./PrepTicketSummary";
import { usePrepTicket } from "@/lib/hooks/use-sub-kitchen";
import { formatDate } from "@/lib/utils";
import type { PrepTicket } from "@/lib/types/sub-kitchen";

/** The ticket's own clock, in the order the job actually moves through it. */
const TIMELINE: { label: string; key: keyof PrepTicket }[] = [
  { label: "Created", key: "created_at" },
  { label: "Started", key: "started_at" },
  { label: "Ready", key: "ready_at" },
  { label: "Completed", key: "completed_at" },
  { label: "Cancelled", key: "cancelled_at" },
];

/**
 * One prep job in full — read-only everywhere it's used. Nothing here mutates:
 * the moves live on the board card, in the portal, where the work happens.
 */
export function PrepTicketDetail({ id }: { id: string }) {
  const ticket = usePrepTicket(id);

  return (
    <PageState
      isLoading={ticket.isLoading}
      isError={ticket.isError}
      data={ticket.data}
      errorTitle="Couldn't load this job"
      errorDescription={ticket.error instanceof Error ? ticket.error.message : undefined}
      onRetry={() => ticket.refetch()}
      emptyTitle="Job not found"
      emptyDescription="It may have been cancelled, or it belongs to another branch."
    >
      {(t) => (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <PrepTicketSummary ticket={t} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {TIMELINE.map(({ label, key }) => {
                  const at = t[key] as string | null;
                  return (
                    <li key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted">{label}</span>
                      <span className={at ? "text-content" : "text-faint"}>
                        {at ? formatDate(at) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {t.recipe_id && (
            <p className="text-xs text-faint">
              Completed from recipe {t.recipe_id}
              {t.production_run_id ? ` · production run ${t.production_run_id}` : ""}
            </p>
          )}
        </div>
      )}
    </PageState>
  );
}
