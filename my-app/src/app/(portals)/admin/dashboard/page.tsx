"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  Building2,
  CookingPot,
  Inbox,
  Package,
  Users,
  Warehouse,
} from "lucide-react";
import {
  formatRequestType,
  RequestStatusBadge,
} from "@/components/admin/requests/RequestStatusBadge";
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
import { SubKitchenModeBanner } from "@/components/dashboard/SubKitchenModeBanner";
import { useMyRestaurant } from "@/lib/hooks/use-admin-restaurant";
import { useEmployees } from "@/lib/hooks/use-employees";
import {
  useBranches,
  useKitchens,
  useWarehouses,
} from "@/lib/hooks/use-locations";
import {
  useDistributionRequests,
  useProductRequests,
} from "@/lib/hooks/use-requests";
import { resolveRequestFromLabel } from "@/lib/requests";
import type { StockRequest, Warehouse as WarehouseType } from "@/lib/types/admin";
import { formatDate } from "@/lib/utils";

const PENDING_FILTERS = {
  status: "PENDING" as const,
  page: 1,
  page_size: 5,
};

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const restaurant = useMyRestaurant();
  const branches = useBranches();
  const kitchens = useKitchens();
  const warehouses = useWarehouses();
  const employees = useEmployees(1);
  const pendingProducts = useProductRequests(PENDING_FILTERS);
  const pendingDistribution = useDistributionRequests(PENDING_FILTERS);

  const recentPending = useMemo(() => {
    const productItems = pendingProducts.data?.items ?? [];
    const distributionItems = pendingDistribution.data?.items ?? [];
    return [...productItems, ...distributionItems]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);
  }, [pendingProducts.data?.items, pendingDistribution.data?.items]);

  const recentLoading = pendingProducts.isLoading || pendingDistribution.isLoading;
  const recentError = pendingProducts.isError || pendingDistribution.isError;

  const retryRecent = () => {
    void pendingProducts.refetch();
    void pendingDistribution.refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          Restaurant-wide overview for locations, staff, and pending requests.
        </p>
      </div>

      {restaurant.data && (
        <SubKitchenModeBanner
          productionMode={restaurant.data.production_mode}
          guidance={restaurant.data.production_guidance}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Branches"
          value={branches.data?.length ?? 0}
          icon={Building2}
          loading={branches.isLoading}
          href="/admin/branches"
        />
        <StatCard
          label="Kitchens"
          value={kitchens.data?.length ?? 0}
          icon={CookingPot}
          loading={kitchens.isLoading}
          href="/admin/kitchens"
        />
        <StatCard
          label="Warehouses"
          value={warehouses.data?.length ?? 0}
          icon={Warehouse}
          loading={warehouses.isLoading}
          href="/admin/warehouses"
        />
        <StatCard
          label="Employees"
          value={employees.data?.total ?? 0}
          icon={Users}
          loading={employees.isLoading}
          href="/admin/employees"
        />
        <StatCard
          label="Pending product requests"
          value={pendingProducts.data?.total ?? 0}
          icon={Package}
          loading={pendingProducts.isLoading}
          href="/admin/requests"
        />
        <StatCard
          label="Pending distribution"
          value={pendingDistribution.data?.total ?? 0}
          icon={Inbox}
          loading={pendingDistribution.isLoading}
          href="/admin/requests"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Recent pending requests</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/requests">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <RecentPendingTable
            items={recentPending}
            isLoading={recentLoading}
            isError={recentError}
            onRetry={retryRecent}
            onRowClick={(id) => router.push(`/admin/requests/${id}`)}
            warehouses={warehouses.data}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RecentPendingTable({
  items,
  isLoading,
  isError,
  onRetry,
  onRowClick,
  warehouses,
}: {
  items: StockRequest[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRowClick: (id: string) => void;
  warehouses?: WarehouseType[];
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="Failed to load pending requests." onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No pending requests"
        description="New product and distribution requests will show up here."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>From</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((req) => (
          <TableRow
            key={req.id}
            className="cursor-pointer"
            onClick={() => onRowClick(req.id)}
          >
            <TableCell>
              <p className="font-medium text-content">
                {resolveRequestFromLabel(req, warehouses) || "-"}
              </p>
              <p className="text-xs text-muted">{req.line_items.length} line item(s)</p>
            </TableCell>
            <TableCell className="text-muted">{formatRequestType(req.type)}</TableCell>
            <TableCell>
              <RequestStatusBadge status={req.status} />
            </TableCell>
            <TableCell className="text-muted">{formatDate(req.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
