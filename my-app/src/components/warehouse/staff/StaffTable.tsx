"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  onEdit?: (staff: WarehouseStaff) => void;
  onDelete?: (staff: WarehouseStaff) => void;
}

export function StaffTable({ items, isLoading, isError, onRetry, onEdit, onDelete }: StaffTableProps) {
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
            description="Staff you add will appear here, alongside anyone else assigned to your warehouse."
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
              {showActions && <TableHead className="w-[72px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>
                  <p className="font-medium text-content">{staff.full_name || "-"}</p>
                </TableCell>
                <TableCell className="text-muted">{staff.email}</TableCell>
                <TableCell>
                  <Badge variant={staff.is_active ? "success" : "secondary"}>
                    {staff.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted">
                  {staff.created_at ? formatDate(staff.created_at) : "-"}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
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
                        {onDelete && (
                          <>
                            {onEdit && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              className="text-danger"
                              onClick={() => onDelete(staff)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
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
