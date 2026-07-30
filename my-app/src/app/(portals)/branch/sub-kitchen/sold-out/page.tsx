"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { EightySixDialog } from "@/components/branch/EightySixDialog";
import {
  useSetSubKitchenAvailability,
  useSubKitchenAvailability,
} from "@/lib/hooks/use-sub-kitchen";
import type { SubKitchenAvailabilityRow } from "@/lib/types/sub-kitchen";

const labelFor = (row: SubKitchenAvailabilityRow) =>
  row.product_name ?? `Item #${row.menu_item_id}`;

export default function SubKitchenSoldOutPage() {
  const availability = useSubKitchenAvailability();
  const setAvailability = useSetSubKitchenAvailability();
  const [editing, setEditing] = useState<SubKitchenAvailabilityRow | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sold out</CardTitle>
          <CardDescription>
            Take an item off so the tills stop selling it. Staff still see it, greyed out — running
            out is worth saying.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PageState
            isLoading={availability.isLoading}
            isError={availability.isError}
            data={availability.data}
            isEmpty={(rows) => rows.length === 0}
            errorTitle="Couldn't load items"
            errorDescription={
              availability.error instanceof Error ? availability.error.message : undefined
            }
            onRetry={() => availability.refetch()}
            emptyTitle="Nothing to sell yet"
            emptyDescription="Sellable items for this branch will appear here."
          >
            {(rows) => (
              <ul className="divide-y divide-line">
                {rows.map((row) => (
                  <li key={row.menu_item_id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-content">{labelFor(row)}</p>
                      {row.reason && <p className="text-xs text-muted">{row.reason}</p>}
                    </div>
                    {row.on_hand != null && (
                      <span className="shrink-0 text-xs tabular-nums text-faint">
                        {row.on_hand} on hand
                      </span>
                    )}
                    <Badge variant={row.is_available ? "secondary" : "destructive"}>
                      {row.is_available ? "on" : "off"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                      {row.is_available ? "86 it" : "Put back"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </PageState>
        </CardContent>
      </Card>

      <EightySixDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing ? labelFor(editing) : ""}
        isAvailable={editing?.is_available ?? false}
        currentReason={editing?.reason}
        isPending={setAvailability.isPending}
        onSubmit={(available, reason, autoClearAt) => {
          if (!editing) return;
          setAvailability.mutate(
            {
              menuItemId: editing.menu_item_id,
              body: {
                is_available: available,
                reason: available ? undefined : reason || "86'd",
                auto_clear_at: autoClearAt,
              },
            },
            { onSuccess: () => setEditing(null) },
          );
        }}
      />
    </div>
  );
}
