"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrepTicketSummary } from "@/components/branch/sub-kitchen/PrepTicketSummary";
import { usePrepBoard } from "@/lib/hooks/use-sub-kitchen";
import { prepStatusLabel } from "@/lib/sub-kitchen/prep-transitions";
import type { PrepStatus } from "@/lib/types/sub-kitchen";

type BoardFilter = "OPEN" | "COMPLETED" | "CANCELLED";

const FILTERS: { value: BoardFilter; label: string }[] = [
  { value: "OPEN", label: "Open work" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const OPEN_ORDER: PrepStatus[] = ["QUEUED", "IN_PROGRESS", "READY"];

/**
 * The manager's live board — the same tickets the station sees, with no moves.
 * Cards are `PrepTicketSummary`, which has no mutation hooks in it at all, so
 * there is no operate path to accidentally expose here. Each card links to the
 * job detail; that is the only thing you can do from this screen.
 */
export default function BranchSubKitchenBoardPage() {
  const [filter, setFilter] = useState<BoardFilter>("OPEN");
  const board = usePrepBoard(filter === "OPEN" ? undefined : { status: filter });

  const groups = useMemo(() => {
    const items = board.data?.items ?? [];
    if (filter !== "OPEN") return [{ status: filter as PrepStatus, tickets: items }];
    return OPEN_ORDER.map((status) => ({
      status,
      tickets: items.filter((t) => t.status === status),
    })).filter((g) => g.tickets.length > 0);
  }, [board.data?.items, filter]);

  return (
    <div className="space-y-5">
      <Select value={filter} onValueChange={(v) => setFilter(v as BoardFilter)}>
        <SelectTrigger className="sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTERS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <PageState
        isLoading={board.isLoading}
        isError={board.isError}
        data={board.data?.items}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load the board"
        errorDescription={board.error instanceof Error ? board.error.message : undefined}
        onRetry={() => board.refetch()}
        emptyTitle={filter === "OPEN" ? "Nothing on the board" : "Nothing here"}
        emptyDescription={
          filter === "OPEN"
            ? "The station has no open work right now."
            : "No tickets in this state."
        }
      >
        {() => (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.status} className="space-y-3">
                <h2 className="text-xs font-medium uppercase tracking-wide text-faint">
                  {prepStatusLabel(group.status)} · {group.tickets.length}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/branch/sub-kitchen/tickets/${ticket.id}`}
                      className="rounded-xl transition-colors hover:bg-surface-2/40"
                    >
                      <Card>
                        <CardContent className="p-4">
                          <PrepTicketSummary ticket={ticket} />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageState>
    </div>
  );
}
