"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompleteTicketDialog } from "@/components/branch/sub-kitchen/CompleteTicketDialog";
import { NewBatchDialog } from "@/components/branch/sub-kitchen/NewBatchDialog";
import { PrepTicketCard } from "@/components/branch/sub-kitchen/PrepTicketCard";
import { usePrepBoard } from "@/lib/hooks/use-sub-kitchen";
import { prepStatusLabel } from "@/lib/sub-kitchen/prep-transitions";
import type { PrepStatus, PrepTicket } from "@/lib/types/sub-kitchen";

type BoardFilter = "OPEN" | "COMPLETED" | "CANCELLED";

const FILTERS: { value: BoardFilter; label: string }[] = [
  { value: "OPEN", label: "Open work" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

/** The order statuses stack in for the open board. */
const OPEN_ORDER: PrepStatus[] = ["QUEUED", "IN_PROGRESS", "READY"];

export default function SubKitchenBoardPage() {
  const [filter, setFilter] = useState<BoardFilter>("OPEN");
  const [newBatch, setNewBatch] = useState(false);
  const [completing, setCompleting] = useState<PrepTicket | null>(null);

  const board = usePrepBoard(filter === "OPEN" ? undefined : { status: filter });

  // Group the open board by status; history views are a single group.
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <Button onClick={() => setNewBatch(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          New batch job
        </Button>
      </div>

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
            ? "Queue a batch job, or wait for made-to-order tickets to arrive."
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
                    <PrepTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onComplete={setCompleting}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PageState>

      <NewBatchDialog open={newBatch} onOpenChange={setNewBatch} />
      <CompleteTicketDialog
        ticket={completing}
        open={completing !== null}
        onOpenChange={(o) => {
          if (!o) setCompleting(null);
        }}
      />
    </div>
  );
}
