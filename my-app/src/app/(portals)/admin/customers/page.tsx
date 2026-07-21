"use client";

import { useState } from "react";
import { useAdminCustomers } from "@/lib/hooks/use-customers";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageState } from "@/components/ui/page-state";
import { formatDate } from "@/lib/utils";

/**
 * Read-only. Customers are tenant-scoped, so this is every customer across all
 * of the restaurant's branches. The create/edit/delete verbs live in the Branch
 * portal, close to the till that captures them — Admin only looks.
 */
export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useAdminCustomers({ page });

  const customers = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Customers
        </h1>
        <p className="mt-1 text-sm text-muted">
          All customers across your restaurant&apos;s branches.
        </p>
      </div>

      <PageState
        isLoading={isLoading}
        isError={isError}
        data={customers}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load customers"
        errorDescription={error instanceof Error ? error.message : undefined}
        emptyTitle="No customers yet"
        emptyDescription="Customers captured at your branches will appear here."
      >
        {(rows) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-content">{c.name}</TableCell>
                    <TableCell className="tabular-nums text-muted">{c.phone ?? "-"}</TableCell>
                    <TableCell className="text-muted">{formatDate(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageState>

      {total > pageSize && (
        <div className="flex items-center justify-end gap-3">
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
