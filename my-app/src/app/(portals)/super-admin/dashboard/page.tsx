"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  ShieldOff,
  ShieldCheck,
  Trash2,
  Pencil,
  Receipt,
} from "lucide-react";
import { useRestaurantStats, useRestaurants, useRestaurantMutations } from "@/lib/hooks/use-restaurants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { USE_MOCK } from "@/lib/api";
import { MOCK_ONLY_ACTIONS } from "@/lib/auth/actions";
import type { Restaurant, RestaurantFilters } from "@/lib/types/super-admin";
import { titleCase } from "@/lib/utils";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
        <Icon className="h-4 w-4 text-brand" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : <p className="font-display text-3xl font-semibold">{value}</p>}
      </CardContent>
    </Card>
  );
}

function RestaurantMobileCard({
  restaurant,
  onAction,
  canAction,
}: {
  restaurant: Restaurant;
  onAction: (action: string, r: Restaurant) => void;
  canAction: (action: string) => boolean;
}) {
  return (
    <Card className={cn(restaurant.plan_status === "halted" && "opacity-[var(--halted-opacity)]")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-content">{restaurant.name}</p>
            <p className="text-sm text-muted">{restaurant.admin.email}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction("edit", restaurant)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction("billing", restaurant)}>
                <Receipt className="mr-2 h-4 w-4" /> View billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction(restaurant.plan_status === "active" ? "halt" : "activate", restaurant)}>
                {restaurant.plan_status === "active" ? (
                  <><PauseCircle className="mr-2 h-4 w-4" /> Halt plan</>
                ) : (
                  <><PlayCircle className="mr-2 h-4 w-4" /> Activate plan</>
                )}
              </DropdownMenuItem>
              {USE_MOCK && canAction("revoke") && (
                <DropdownMenuItem onClick={() => onAction(restaurant.admin.access_status === "active" ? "revoke" : "restore", restaurant)}>
                  {restaurant.admin.access_status === "active" ? (
                    <><ShieldOff className="mr-2 h-4 w-4" /> Revoke access</>
                  ) : (
                    <><ShieldCheck className="mr-2 h-4 w-4" /> Restore access</>
                  )}
                </DropdownMenuItem>
              )}
              {USE_MOCK && canAction("delete") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-danger" onClick={() => onAction("delete", restaurant)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{titleCase(restaurant.plan_tier)}</Badge>
          <Badge variant={restaurant.plan_status === "active" ? "success" : "warning"}>
            {titleCase(restaurant.plan_status)}
          </Badge>
          {USE_MOCK && (
            <Badge variant={restaurant.admin.access_status === "active" ? "secondary" : "destructive"}>
              Access: {titleCase(restaurant.admin.access_status)}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted">
          {USE_MOCK
            ? `${restaurant.branch_count} / ${restaurant.branch_limit} branches · ${restaurant.admin.phone}`
            : `${restaurant.branch_limit} branch limit · ${restaurant.admin.email}`}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { can } = useAuth();
  const canAction = (action: string) => {
    if (!USE_MOCK && MOCK_ONLY_ACTIONS.includes(action as (typeof MOCK_ONLY_ACTIONS)[number])) {
      return false;
    }
    return can(action as Parameters<typeof can>[0]);
  };
  const [search, setSearch] = useState("");
  const [planStatus, setPlanStatus] = useState<RestaurantFilters["plan_status"]>("all");
  const [accessStatus, setAccessStatus] = useState<RestaurantFilters["access_status"]>("all");
  const [confirm, setConfirm] = useState<{
    type: string;
    restaurant: Restaurant;
  } | null>(null);

  const filters = useMemo(
    () => ({ search: search || undefined, plan_status: planStatus, access_status: accessStatus }),
    [search, planStatus, accessStatus],
  );

  const stats = useRestaurantStats();
  const restaurants = useRestaurants(filters);
  const mutations = useRestaurantMutations();

  const chartData = stats.data
    ? [
        { name: "Active", count: stats.data.by_plan_status.active },
        { name: "Halted", count: stats.data.by_plan_status.halted },
      ]
    : [];

  const handleConfirm = async () => {
    if (!confirm) return;
    const { type, restaurant } = confirm;
    switch (type) {
      case "halt":
        await mutations.haltPlan.mutateAsync(restaurant.id);
        break;
      case "activate":
        await mutations.activatePlan.mutateAsync(restaurant.id);
        break;
      case "revoke":
        await mutations.revokeAccess.mutateAsync(restaurant.id);
        break;
      case "restore":
        await mutations.restoreAccess.mutateAsync(restaurant.id);
        break;
      case "delete":
        await mutations.deleteRestaurant.mutateAsync(restaurant.id);
        break;
    }
    setConfirm(null);
  };

  const handleAction = (action: string, restaurant: Restaurant) => {
    if (action === "edit") {
      router.push(`/super-admin/restaurants/${restaurant.id}`);
      return;
    }
    if (action === "billing") {
      router.push(`/super-admin/restaurants/${restaurant.id}/billing`);
      return;
    }
    setConfirm({ type: action, restaurant });
  };

  const confirmCopy = useMemo(() => {
    if (!confirm) return null;
    const r = confirm.restaurant;
    switch (confirm.type) {
      case "halt":
        return { title: "Halt plan", description: `Halt the plan for ${r.name}? The restaurant will lose access to paid features.`, destructive: false };
      case "activate":
        return { title: "Activate plan", description: `Reactivate the plan for ${r.name}?`, destructive: false };
      case "revoke":
        return { title: "Revoke admin access", description: `Revoke login access for ${r.admin.name}? This does not delete the restaurant.`, destructive: true };
      case "restore":
        return { title: "Restore admin access", description: `Restore login access for ${r.admin.name}?`, destructive: false };
      case "delete":
        return { title: "Delete restaurant", description: `Permanently delete ${r.name} and its admin. This cannot be undone.`, destructive: true, typeToConfirm: r.name };
      default:
        return null;
    }
  }, [confirm]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">Restaurants</h1>
          <p className="mt-1 text-sm text-muted">Cross-tenant view of all restaurants and their admins.</p>
        </div>
        {can("restaurants:create") && (
          <Button asChild>
            <Link href="/super-admin/restaurants/new">Add restaurant</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total restaurants" value={stats.data?.total ?? 0} icon={Building2} loading={stats.isLoading} />
        <StatCard label="Active plans" value={stats.data?.active_plans ?? 0} icon={PlayCircle} loading={stats.isLoading} />
        <StatCard label="Halted" value={stats.data?.halted ?? 0} icon={PauseCircle} loading={stats.isLoading} />
        {USE_MOCK && (
          <StatCard label="Revoked access" value={stats.data?.revoked ?? 0} icon={ShieldOff} loading={stats.isLoading} />
        )}
      </div>

      {stats.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan status overview</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
                <XAxis dataKey="name" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    background: "rgb(var(--surface))",
                    border: "1px solid rgb(var(--line))",
                    borderRadius: "0.75rem",
                    color: "rgb(var(--content))",
                  }}
                />
                <Bar dataKey="count" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">All restaurants</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search by name or admin email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={planStatus} onValueChange={(v) => setPlanStatus(v as RestaurantFilters["plan_status"])}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Plan status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="halted">Halted</SelectItem>
              </SelectContent>
            </Select>
            {USE_MOCK && (
              <Select value={accessStatus} onValueChange={(v) => setAccessStatus(v as RestaurantFilters["access_status"])}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="Access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All access</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {restaurants.isLoading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {restaurants.isError && (
            <ErrorState description="Failed to load restaurants." onRetry={() => restaurants.refetch()} />
          )}
          {!restaurants.isLoading && !restaurants.isError && restaurants.data?.length === 0 && (
            <EmptyState
              title="No restaurants found"
              description="Try adjusting your filters or add a new restaurant."
              action={
                can("restaurants:create") ? (
                  <Button asChild>
                    <Link href="/super-admin/restaurants/new">Add restaurant</Link>
                  </Button>
                ) : undefined
              }
            />
          )}
          {restaurants.data && restaurants.data.length > 0 && (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>{USE_MOCK ? "Branches" : "Branch limit"}</TableHead>
                      <TableHead>Owner</TableHead>
                      {USE_MOCK && <TableHead>Access</TableHead>}
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restaurants.data.map((r) => (
                      <TableRow
                        key={r.id}
                        className={cn(r.plan_status === "halted" && "opacity-[var(--halted-opacity)]")}
                      >
                        <TableCell>
                          <p className="font-medium">{r.name}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge>{titleCase(r.plan_tier)}</Badge>
                            <Badge variant={r.plan_status === "active" ? "success" : "warning"}>
                              {titleCase(r.plan_status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {USE_MOCK ? `${r.branch_count} / ${r.branch_limit}` : r.branch_limit}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{r.admin.name || "—"}</p>
                          <p className="text-xs text-muted">{r.admin.email}</p>
                        </TableCell>
                        {USE_MOCK && (
                          <TableCell>
                            <Badge variant={r.admin.access_status === "active" ? "secondary" : "destructive"}>
                              {titleCase(r.admin.access_status)}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${r.name}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAction("edit", r)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction("billing", r)}>
                                <Receipt className="mr-2 h-4 w-4" /> View billing
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {canAction("plans:halt") && r.plan_status === "active" && (
                                <DropdownMenuItem onClick={() => handleAction("halt", r)}>
                                  <PauseCircle className="mr-2 h-4 w-4" /> Halt plan
                                </DropdownMenuItem>
                              )}
                              {canAction("plans:activate") && r.plan_status === "halted" && (
                                <DropdownMenuItem onClick={() => handleAction("activate", r)}>
                                  <PlayCircle className="mr-2 h-4 w-4" /> Activate plan
                                </DropdownMenuItem>
                              )}
                              {USE_MOCK && canAction("revoke") && r.admin.access_status === "active" && (
                                <DropdownMenuItem onClick={() => handleAction("revoke", r)}>
                                  <ShieldOff className="mr-2 h-4 w-4" /> Revoke access
                                </DropdownMenuItem>
                              )}
                              {USE_MOCK && canAction("restore") && r.admin.access_status === "revoked" && (
                                <DropdownMenuItem onClick={() => handleAction("restore", r)}>
                                  <ShieldCheck className="mr-2 h-4 w-4" /> Restore access
                                </DropdownMenuItem>
                              )}
                              {USE_MOCK && canAction("delete") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-danger" onClick={() => handleAction("delete", r)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {restaurants.data.map((r) => (
                  <RestaurantMobileCard key={r.id} restaurant={r} onAction={handleAction} canAction={canAction} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {confirmCopy && (
        <ConfirmDialog
          open={!!confirm}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          destructive={confirmCopy.destructive}
          typeToConfirm={confirmCopy.typeToConfirm}
          onConfirm={handleConfirm}
          loading={
            mutations.haltPlan.isPending ||
            mutations.activatePlan.isPending ||
            mutations.revokeAccess.isPending ||
            mutations.restoreAccess.isPending ||
            mutations.deleteRestaurant.isPending
          }
        />
      )}
    </div>
  );
}
