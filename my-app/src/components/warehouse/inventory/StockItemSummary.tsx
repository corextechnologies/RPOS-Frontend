import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/lib/types/warehouse";

/** Read-only context header shared by the stock movement dialogs. */
export function StockItemSummary({ item }: { item: InventoryItem }) {
  return (
    <div className="space-y-1 rounded-xl border border-line bg-surface-2/40 px-4 py-3">
      <p className="font-medium text-content">{item.product.name}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {item.batch_code ? (
          <span>Batch {item.batch_code}</span>
        ) : (
          <Badge variant="secondary">Unbatched</Badge>
        )}
        {item.expiry_date && <span>Expires {item.expiry_date}</span>}
        <span>{item.quantity} on hand</span>
      </div>
    </div>
  );
}
