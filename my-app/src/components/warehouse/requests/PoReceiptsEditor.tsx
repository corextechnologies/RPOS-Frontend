"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WarehouseRequestLineItem } from "@/lib/types/warehouse";
import {
  lineCap,
  type ReceiptDraft,
} from "@/lib/schemas/warehouse-receipt";

interface PoReceiptsEditorProps {
  lines: WarehouseRequestLineItem[];
  drafts: ReceiptDraft[];
  /** REPORTED collects an issue per line; RECEIVED collects batch and expiry. */
  mode: "RECEIVED" | "REPORTED";
  /** True on the re-enqueue path, where the quantity is a cumulative total. */
  isCumulative: boolean;
  onChange: (lineItemId: string, patch: Partial<ReceiptDraft>) => void;
}

/**
 * Per-line receipt editor for a purchase order.
 *
 * Prefilled from the PO's own lines so the common case — everything arrived —
 * is a single click. `line_item_id` is carried from `line_items[].id`; the
 * product id would be silently wrong on the wire.
 */
export function PoReceiptsEditor({
  lines,
  drafts,
  mode,
  isCumulative,
  onChange,
}: PoReceiptsEditorProps) {
  const draftFor = (id: string) => drafts.find((d) => d.line_item_id === id);

  return (
    <div className="space-y-3">
      {lines.map((line) => {
        const draft = draftFor(line.id);
        if (!draft) return null;
        const cap = lineCap(line);
        const value = Number(draft.quantity_received);
        const short = draft.quantity_received !== "" && value < cap;

        return (
          <div
            key={line.id}
            className="space-y-3 rounded-xl border border-line bg-surface-2/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-content">{line.product_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>
                  {line.quantity_approved != null &&
                  line.quantity_approved < line.quantity_requested
                    ? `${line.quantity_approved} approved of ${line.quantity_requested}`
                    : `${cap} ordered`}
                </span>
                {short && <Badge variant="warning">Short</Badge>}
              </div>
            </div>

            {line.quantity_received != null && (
              <p className="text-xs text-muted">
                Previously reported: {line.quantity_received}
                {line.issue_note ? ` — ${line.issue_note}` : ""}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`qty-${line.id}`}>
                  {/* The re-enqueue path confirms the whole order, not the
                      delivery that just turned up. Saying "total" is the
                      difference between correct stock and under-booking it. */}
                  {isCumulative ? "Total received" : "Quantity received"}
                </Label>
                <Input
                  id={`qty-${line.id}`}
                  type="number"
                  min={0}
                  max={cap}
                  step="any"
                  inputMode="decimal"
                  value={draft.quantity_received}
                  aria-invalid={
                    draft.quantity_received === "" ||
                    !Number.isInteger(value) ||
                    value < 0 ||
                    value > cap
                  }
                  onChange={(e) =>
                    onChange(line.id, { quantity_received: e.target.value })
                  }
                />
              </div>

              {mode === "RECEIVED" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor={`batch-${line.id}`}>Batch code</Label>
                    <Input
                      id={`batch-${line.id}`}
                      placeholder="No batch"
                      value={draft.batch_code}
                      onChange={(e) =>
                        onChange(line.id, { batch_code: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`expiry-${line.id}`}>Expiry</Label>
                    <Input
                      id={`expiry-${line.id}`}
                      type="date"
                      value={draft.expiry_date}
                      onChange={(e) =>
                        onChange(line.id, { expiry_date: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`issue-${line.id}`}>What was wrong?</Label>
                  <Textarea
                    id={`issue-${line.id}`}
                    rows={2}
                    placeholder="e.g. 20 bags missing"
                    value={draft.issue_note}
                    onChange={(e) =>
                      onChange(line.id, { issue_note: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {mode === "RECEIVED" && (
        <p className="text-xs text-muted">
          {/* Omitting batch/expiry is legal but hides the stock from expiry
              alerts and labels — worth saying, not silently allowing. */}
          Leave the batch blank for unbatched stock. Without an expiry date, this
          stock will not appear in near-expiry alerts or on expiry labels.
        </p>
      )}
    </div>
  );
}
