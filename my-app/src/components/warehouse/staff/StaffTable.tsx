"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaffAvatar } from "@/components/ui/staff-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { WarehouseStaff } from "@/lib/types/warehouse";
import { formatDate } from "@/lib/utils";

interface StaffTableProps {
  items?: WarehouseStaff[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  onRowClick?: (staff: WarehouseStaff) => void;
  onEdit?: (staff: WarehouseStaff) => void;
  onDelete?: (staff: WarehouseStaff) => void;
}

export function StaffTable({
  items,
  isLoading,
  isError,
  onRetry,
  onRowClick,
  onEdit,
  onDelete,
}: StaffTableProps) {
  const showActions = Boolean(onEdit || onDelete);

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
          <ErrorState description="Failed to load staff." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No staff yet"
            description="Staff you add to the warehouse roster appear here."
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
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Added</TableHead>
              {showActions && <TableHead className="w-[72px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((staff) => (
              <TableRow
                key={staff.id}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? `View ${staff.full_name || staff.email}` : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={onRowClick ? () => onRowClick(staff) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(staff);
                        }
                      }
                    : undefined
                }
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <StaffAvatar imageUrl={staff.image_url} name={staff.full_name} />
                    <p className="font-medium text-content">{staff.full_name || "-"}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted">{staff.job_title || "-"}</TableCell>
                <TableCell className="text-muted">{staff.email}</TableCell>
                <TableCell className="text-muted tabular-nums">
                  {staff.phone_number || "-"}
                </TableCell>
                <TableCell className="text-muted">
                  {staff.created_at ? formatDate(staff.created_at) : "-"}
                </TableCell>
                {showActions && (
                  // Stop propagation so opening the menu doesn't also open the
                  // detail dialog behind it.
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(staff)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {onEdit && onDelete && <DropdownMenuSeparator />}
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-danger"
                            onClick={() => onDelete(staff)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
