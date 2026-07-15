"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import type { KitchenStaff } from "@/lib/types/kitchen";
import { formatDate } from "@/lib/utils";

interface SubChefTableProps {
  items?: KitchenStaff[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

/**
 * Sub-chefs created by the signed-in manager.
 *
 * There are no edit, deactivate, or delete actions on purpose: the API has no
 * endpoints for them in this phase, so the buttons would have nowhere to go.
 */
export function SubChefTable({
  items,
  isLoading,
  isError,
  onRetry,
}: SubChefTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <ErrorState description="Failed to load sub-chefs." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No sub-chefs yet"
            description="Sub-chefs you add appear here. You only ever see the accounts you created."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>
                  <p className="font-medium text-content">{staff.full_name || "—"}</p>
                </TableCell>
                <TableCell className="text-muted">{staff.email}</TableCell>
                <TableCell>
                  <Badge variant={staff.is_active ? "success" : "secondary"}>
                    {staff.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted">
                  {staff.created_at ? formatDate(staff.created_at) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
