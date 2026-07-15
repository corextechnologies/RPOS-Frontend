"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { RecordSaleDialog } from "@/components/admin/sales/RecordSaleDialog";
import { SalesSummaryPanel } from "@/components/admin/sales/SalesSummaryPanel";
import { SalesTable } from "@/components/admin/sales/SalesTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useBranches } from "@/lib/hooks/use-locations";
import { useRecordSale, useSalesRecords } from "@/lib/hooks/use-sales";
import type { RecordSaleForm } from "@/lib/schemas/sale";
import type { CreateSaleInput, SalesRecord } from "@/lib/types/admin";
import { cn } from "@/lib/utils";

const ALL_BRANCHES = "all";
const PAGE_SIZE = 50;

type SalesTab = "summary" | "records";

export default function AdminSalesPage() {
  const { can } = useAuth();
  const branches = useBranches();
  const recordSale = useRecordSale();
  const [tab, setTab] = useState<SalesTab>("summary");
  const [page, setPage] = useState(1);
  const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filters = useMemo(
    () => ({
      branch_id: branchFilter === ALL_BRANCHES ? undefined : branchFilter,
      page,
      page_size: PAGE_SIZE,
    }),
    [branchFilter, page],
  );

  const sales = useSalesRecords(filters);

  const branchLabel = useMemo(() => {
    const names = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
    return (sale: SalesRecord) => {
      if (!sale.branch_id) return "—";
      return names.get(sale.branch_id) ?? `Branch ${sale.branch_id}`;
    };
  }, [branches.data]);

  const total = sales.data?.total ?? 0;
  const pageSize = sales.data?.page_size ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleRecord = async (values: RecordSaleForm) => {
    const body: CreateSaleInput = { amount: values.amount };
    if (values.occurred_at) {
      body.occurred_at = new Date(values.occurred_at).toISOString();
    }
    if (values.branch_id) body.branch_id = values.branch_id;
    if (values.note && values.note.trim()) body.note = values.note.trim();
    await recordSale.mutateAsync(body);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Sales
          </h1>
          <p className="mt-1 text-sm text-muted">
            Record sales and review your restaurant&apos;s revenue history.
          </p>
        </div>
        {can("sales:create") && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Record sale
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={tab === "summary" ? "default" : "outline"}
          className={cn(tab === "summary" && "pointer-events-none")}
          onClick={() => setTab("summary")}
        >
          Summary
        </Button>
        <Button
          type="button"
          variant={tab === "records" ? "default" : "outline"}
          className={cn(tab === "records" && "pointer-events-none")}
          onClick={() => setTab("records")}
        >
          Records
        </Button>
      </div>

      {tab === "summary" ? (
        <SalesSummaryPanel branches={branches.data ?? []} />
      ) : (
        <>
          <div className="flex justify-end">
            <Select
              value={branchFilter}
              onValueChange={(value) => {
                setBranchFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
                {(branches.data ?? []).map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SalesTable
            items={sales.data?.items}
            isLoading={sales.isLoading}
            isError={sales.isError}
            onRetry={() => sales.refetch()}
            branchLabel={branchLabel}
          />

          {total > pageSize && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || sales.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || sales.isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <RecordSaleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleRecord}
        isSubmitting={recordSale.isPending}
        branches={branches.data ?? []}
      />
    </div>
  );
}
