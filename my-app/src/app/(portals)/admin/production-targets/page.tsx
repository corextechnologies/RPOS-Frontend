"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import { useKitchens } from "@/lib/hooks/use-locations";
import { useRestaurantFeatures } from "@/lib/hooks/use-restaurant-features";
import { useProductionTargets } from "@/lib/hooks/use-production-targets";
import type { AdminProductionTargetFilters } from "@/lib/types/production-target";

const ALL_KITCHENS = "all";

export default function AdminProductionTargetsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const kitchens = useKitchens();
  const { hasCentralKitchen, isLoading: featuresLoading } = useRestaurantFeatures();
  const [kitchenId, setKitchenId] = useState<string>(ALL_KITCHENS);
  const [date, setDate] = useState("");

  const filters: AdminProductionTargetFilters | undefined = useMemo(() => {
    const f: AdminProductionTargetFilters = {};
    if (kitchenId !== ALL_KITCHENS) f.kitchen_id = kitchenId;
    if (date) f.date = date;
    return Object.keys(f).length ? f : undefined;
  }, [kitchenId, date]);

  const { data, isLoading, isError, error, refetch } = useProductionTargets(filters);
  const targets = (data ?? []).filter((t) => t.status === "PENDING");
  const filtering = kitchenId !== ALL_KITCHENS || !!date;

  // No central kitchen → no production targets (they are keyed to a kitchen).
  // Guards direct URL access even though the nav item is hidden.
  if (!featuresLoading && !hasCentralKitchen) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production targets
          </h1>
        </div>
        <EmptyState
          title="Central kitchen is disabled"
          description="This restaurant runs without a central kitchen, so there are no production targets to set. Each branch produces to order in its own sub-kitchen."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production targets
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tell each kitchen how many of each product to make on a given day.
          </p>
        </div>
        {can("production-targets:create") && (
          <Button asChild>
            <Link href="/admin/production-targets/new">
              <Plus className="mr-1.5 size-4" aria-hidden />
              New target
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={kitchenId} onValueChange={setKitchenId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Kitchen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_KITCHENS}>All kitchens</SelectItem>
            {(kitchens.data ?? []).map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-44"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Filter by date"
        />
        {filtering && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setKitchenId(ALL_KITCHENS);
              setDate("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <PageState
        isLoading={isLoading}
        isError={isError}
        data={targets}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load targets"
        errorDescription={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
        emptyTitle={filtering ? "No matching targets" : "No production targets yet"}
        emptyDescription={
          filtering
            ? "Try a different kitchen or date."
            : "Create a target to tell a kitchen what to make."
        }
      >
        {(rows) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kitchen</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/production-targets/${t.id}`)}
                  >
                    <TableCell className="font-medium text-content">
                      {t.kitchen_name}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted">
                      {t.target_date}
                    </TableCell>
                    <TableCell>
                      <ProductionTargetStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted">
                      {t.lines.length}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted">
                      {t.note ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageState>
    </div>
  );
}
