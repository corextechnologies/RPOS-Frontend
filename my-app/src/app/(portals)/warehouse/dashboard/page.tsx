"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Inbox,
  Layers,
  TriangleAlert,
} from "lucide-react";
import {
  formatWarehouseRequestType,
  WarehouseStatusBadge,
} from "@/components/warehouse/requests/WarehouseStatusBadge";
import { NearExpiryList } from "@/components/warehouse/waste/NearExpiryList";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  NEAR_EXPIRY_DEFAULT_DAYS,
  useNearExpiryInventory,
  useWarehouseInventory,
} from "@/lib/hooks/use-warehouse-inventory";
import {
  useWarehouseKitchenRequests,
  useWarehousePos,
} from "@/lib/hooks/use-warehouse-requests";
import type { WarehouseRequest } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import { formatDate } from "@/lib/utils";

/**
 * Only the statuses this manager can actually act on.
 *
 * DISPATCHED means opposite things per request type, so these constants are only
 * safe because each is passed to a type-scoped endpoint: PENDING kitchen
 * requests are ours to approve, and a DISPATCHED PO is ours to receive or
 * report. Never reuse either across the other inbox.
 */
const KITCHEN_TO_ACTION = { status: "PENDING" as const, page: 1, page_size: 5 };
const PO_TO_ACTION = { status: "DISPATCHED" as const, page: 1, page_size: 5 };

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  href?: string;
}) {
  const content = (
    <Card className={href ? "transition hover:bg-surface-2/40" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
        <Icon className="h-4 w-4 text-brand" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="font-display text-3xl font-semibold text-content">{value}</p>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block focus-ring rounded-2xl">
      {content}
    </Link>
  );
}

export default function WarehouseDashboardPage() {
  const router = useRouter();
  const inventory = useWarehouseInventory();
  const nearExpiry = useNearExpiryInventory(NEAR_EXPIRY_DEFAULT_DAYS);
  const kitchenRequests = useWarehouseKitchenRequests(KITCHEN_TO_ACTION);
  const purchaseOrders = useWarehousePos(PO_TO_ACTION);

  const unassigned =
    isMissingWarehouseAssignment(inventory.error) ||
    isMissingWarehouseAssignment(nearExpiry.error) ||
    isMissingWarehouseAssignment(kitchenRequests.error) ||
    isMissingWarehouseAssignment(purchaseOrders.error);

  const stock = useMemo(() => {
    const items = inventory.data ?? [];
    return {
      products: new Set(items.map((item) => item.product_id)).size,
      units: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [inventory.data]);

  const needsAction = useMemo(() => {
    const kitchen = kitchenRequests.data?.items ?? [];
    const pos = purchaseOrders.data?.items ?? [];
    return [...kitchen, ...pos]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);
  }, [kitchenRequests.data?.items, purchaseOrders.data?.items]);

  const actionLoading = kitchenRequests.isLoading || purchaseOrders.isLoading;
  const actionError = kitchenRequests.isError || purchaseOrders.isError;

  const retryAction = () => {
    void kitchenRequests.refetch();
    void purchaseOrders.refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          Stock, expiry alerts, and requests waiting on your warehouse.
        </p>
      </div>

      {unassigned ? (
        <WarehouseUnassigned />
      ) : (
        <>
          {/* Expiry alerts sit above the fold on purpose — they are the reason
              this screen exists, and burying them defeats the alert. */}
          <NearExpiryList
            items={nearExpiry.data}
            withinDays={NEAR_EXPIRY_DEFAULT_DAYS}
            isLoading={nearExpiry.isLoading}
            isError={nearExpiry.isError}
            onRetry={() => nearExpiry.refetch()}
            headerAction={
              <Button variant="outline" size="sm" asChild>
                <Link href="/warehouse/waste">Manage</Link>
              </Button>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Products on hand"
              value={stock.products}
              icon={Boxes}
              loading={inventory.isLoading}
              href="/warehouse/inventory"
            />
            <StatCard
              label="Units on hand"
              value={stock.units}
              icon={Layers}
              loading={inventory.isLoading}
              href="/warehouse/inventory"
            />
            <StatCard
              label="Kitchen requests to action"
              value={kitchenRequests.data?.total ?? 0}
              icon={Inbox}
              loading={kitchenRequests.isLoading}
              href="/warehouse/requests/kitchen"
            />
            <StatCard
              label="Orders to receive"
              value={purchaseOrders.data?.total ?? 0}
              icon={ClipboardList}
              loading={purchaseOrders.isLoading}
              href="/warehouse/requests/po"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle>Waiting on you</CardTitle>
              <TriangleAlert className="h-4 w-4 text-muted" />
            </CardHeader>
            <CardContent className="p-0">
              <NeedsActionTable
                items={needsAction}
                isLoading={actionLoading}
                isError={actionError}
                onRetry={retryAction}
                onRowClick={(id) => router.push(`/warehouse/requests/${id}`)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function NeedsActionTable({
  items,
  isLoading,
  isError,
  onRetry,
  onRowClick,
}: {
  items: WarehouseRequest[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRowClick: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="Failed to load requests." onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing waiting"
        description="Kitchen requests to approve and orders to receive will show up here."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Items</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Raised</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((request) => (
          <TableRow
            key={request.id}
            className="cursor-pointer"
            onClick={() => onRowClick(request.id)}
          >
            <TableCell>
              <p className="font-medium text-content">
                {request.line_items[0]?.product_name ?? "-"}
              </p>
              <p className="text-xs text-muted">
                {request.line_items.length} line item(s)
              </p>
            </TableCell>
            <TableCell className="text-muted">
              {formatWarehouseRequestType(request.request_type)}
            </TableCell>
            <TableCell>
              <WarehouseStatusBadge status={request.status} />
            </TableCell>
            <TableCell className="text-muted">
              {formatDate(request.created_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
