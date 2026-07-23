"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { stockUnitLabel } from "@/lib/stock-unit";
import type { KitchenInventoryItem } from "@/lib/types/kitchen";

interface KitchenNearExpiryListProps {
  items?: KitchenInventoryItem[];
  withinDays: number;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  /** Omit for a read-only list — the dashboard links out instead of acting. */
  onWaste?: (item: KitchenInventoryItem) => void;
  headerAction?: React.ReactNode;
}

/** Whole days from today until `date` (`YYYY-MM-DD`); negative once past. */
function daysUntil(date: string): number {
  const today = new Date();
  const midnightToday = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - midnightToday) / 86_400_000);
}

function expiryLabel(days: number): { text: string; expired: boolean } {
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, expired: true };
  if (days === 0) return { text: "Expires today", expired: true };
  return { text: `${days}d left`, expired: false };
}

export function KitchenNearExpiryList({
  items,
  withinDays,
  isLoading,
  isError,
  onRetry,
  onWaste,
  headerAction,
}: KitchenNearExpiryListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-warning/10 text-warning">
                <AlertTriangle className="h-4 w-4" />
              </span>
              Expiring soon
            </CardTitle>
            <CardDescription>
              Stock expiring within {withinDays} {withinDays === 1 ? "day" : "days"},
              soonest first, including anything already past its date.
            </CardDescription>
          </div>
          {headerAction}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState description="Failed to load expiry alerts." onRetry={onRetry} />
        ) : !items || items.length === 0 ? (
          <p className="py-2 text-sm text-muted">Nothing expiring in this window.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const label = item.expiry_date
                ? expiryLabel(daysUntil(item.expiry_date))
                : null;
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/40 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-content">{item.product.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      {item.batch_code ? (
                        <span>Batch {item.batch_code}</span>
                      ) : (
                        <Badge variant="secondary">No batch</Badge>
                      )}
                      <span>
                        {item.quantity}
                        {stockUnitLabel(item.product.stock_unit) &&
                          ` ${stockUnitLabel(item.product.stock_unit)}`}{" "}
                        on hand
                      </span>
                      <span>{item.expiry_date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {label && (
                      <Badge variant={label.expired ? "destructive" : "warning"}>
                        {label.text}
                      </Badge>
                    )}
                    {onWaste && (
                      <Button variant="outline" size="sm" onClick={() => onWaste(item)}>
                        Write off
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
