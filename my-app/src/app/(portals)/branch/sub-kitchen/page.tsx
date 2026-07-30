"use client";

import { PageState } from "@/components/ui/page-state";
import { usePrepBoard } from "@/lib/hooks/use-sub-kitchen";

/**
 * The prep board. Chunk 2 wires the data path end to end; the card UI (grouped
 * by status, ORDER vs BATCH, start/ready/complete/cancel) arrives in Chunk 3.
 */
export default function SubKitchenBoardPage() {
  const board = usePrepBoard();

  return (
    <PageState
      isLoading={board.isLoading}
      isError={board.isError}
      data={board.data?.items}
      isEmpty={(rows) => rows.length === 0}
      errorTitle="Couldn't load the board"
      errorDescription={board.error instanceof Error ? board.error.message : undefined}
      onRetry={() => board.refetch()}
      emptyTitle="Nothing on the board"
      emptyDescription="Queue a batch job, or wait for made-to-order tickets to arrive."
    >
      {(rows) => (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">
            {rows.length} open ticket{rows.length === 1 ? "" : "s"}. The board cards
            arrive in the next chunk.
          </p>
        </div>
      )}
    </PageState>
  );
}
