"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import {
  MOVEMENT_TYPE_LABELS,
  WASTE_REASON_LABELS,
} from "@/lib/stock/waste-reason";
import type { WasteEvent } from "@/lib/types/waste";

interface WasteEventsTableProps {
  items?: WasteEvent[];
  /** Optional section heading rendered above the table. */
  title?: string;
  description?: string;
  /** When `onSearchChange` is set, the table renders its own search box in the
   * header (controlled via `searchValue`). Otherwise pass `search` to filter
   * from an input the page owns. */
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Show the location column — Admin sees every location, a warehouse doesn't. */
  showLocation?: boolean;
  /** Resolve a location's display name (Admin only). */
  locationName?: (event: WasteEvent) => string;
  /** Open a row's full detail card (both portals). */
  onSelect?: (event: WasteEvent) => void;
  /** External filter value, when the page owns the search input. */
  search?: string;
  /**
   * Show the Batch column. Portals that track stock by product rather than batch
   * (the Branch) hide it; warehouse/kitchen/admin keep it. Defaults to shown.
   */
  showBatch?: boolean;
}

/**
 * Write-off history: what was wasted or expired, how much, why, and when.
 *
 * Rows are clickable when `onSelect` is set — the detail card carries the fields
 * that don't fit here (notably the notes). Quantity is the amount written off,
 * never on-hand.
 *
 * The header (title, description, search box) renders only when those props are
 * passed. A page can either let the table own the search — pass `searchValue` +
 * `onSearchChange` — or filter from its own input by passing `search`.
 */
export function WasteEventsTable({
  items,
  title,
  description,
  searchPlaceholder = "Search name, SKU, or batch…",
  searchValue,
  onSearchChange,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "Nothing written off yet",
  emptyDescription = "Waste and expired stock will appear here once it's written off.",
  showLocation = false,
  locationName,
  onSelect,
  search = "",
  showBatch = true,
}: WasteEventsTableProps) {
  // Client-side search over the loaded log (these lists aren't paginated).
  // Matches product name, SKU, or batch code — case-insensitive. Prefer the
  // controlled `searchValue` when present, else the page-owned `search`.
  const query = (searchValue ?? search).trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query || !items) return items ?? [];
    return items.filter(
      (event) =>
        event.product.name.toLowerCase().includes(query) ||
        (event.product.sku ?? "").toLowerCase().includes(query) ||
        event.batch_code.toLowerCase().includes(query),
    );
  }, [items, query]);

  const header =
    title || description || onSearchChange ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {(title || description) && (
          <div>
            {title && (
              <h2 className="font-display text-lg font-semibold tracking-tight text-content">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
        )}
        {onSearchChange && (
          <Input
            className="sm:w-80"
            placeholder={searchPlaceholder}
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}
      </div>
    ) : null;

  const content = (() => {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      );
    }

    if (isError) {
      return (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Failed to load waste history."
              onRetry={onRetry}
            />
          </CardContent>
        </Card>
      );
    }

    if (!items || items.length === 0) {
      return (
        <Card>
          <CardContent className="p-0">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </CardContent>
        </Card>
      );
    }

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No matches"
              description="No waste or expired stock matches your search."
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  {showBatch && <TableHead>Batch</TableHead>}
                  {showLocation && <TableHead>Location</TableHead>}
                  <TableHead>Written off</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((event) => (
                  <TableRow
                    key={event.id}
                    onClick={onSelect ? () => onSelect(event) : undefined}
                    className={onSelect ? "cursor-pointer" : undefined}
                  >
                    <TableCell>
                      <p className="font-medium text-content">
                        {event.product.name}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted">
                      {event.product.sku || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          event.movement_type === "EXPIRY"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {MOVEMENT_TYPE_LABELS[event.movement_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted">
                      {event.waste_reason
                        ? WASTE_REASON_LABELS[event.waste_reason]
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-content">
                      {event.quantity}
                    </TableCell>
                    {showBatch && (
                      <TableCell>
                        {event.batch_code ? (
                          <span className="text-muted">{event.batch_code}</span>
                        ) : (
                          <Badge variant="secondary">Unbatched</Badge>
                        )}
                      </TableCell>
                    )}
                    {showLocation && (
                      <TableCell>
                        <Badge variant="secondary">{event.location_type}</Badge>
                        <p className="mt-1 text-xs text-muted">
                          {locationName
                            ? locationName(event)
                            : event.location_id}
                        </p>
                      </TableCell>
                    )}
                    <TableCell>
                      <p className="text-content">
                        {formatDate(event.created_at)}
                      </p>
                      {event.created_by && (
                        <p className="mt-0.5 text-xs text-muted">
                          by {event.created_by}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  })();

  if (!header) return content;

  return (
    <div className="space-y-3">
      {header}
      {content}
    </div>
  );
}
