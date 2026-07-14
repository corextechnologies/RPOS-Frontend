"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

export type LocationKind = "branch" | "kitchen" | "warehouse";

export interface LocationListItem {
  id: string;
  name: string;
  location?: string | null;
  created_at?: string;
}

const KIND_LABELS: Record<LocationKind, { singular: string; plural: string }> = {
  branch: { singular: "branch", plural: "branches" },
  kitchen: { singular: "kitchen", plural: "kitchens" },
  warehouse: { singular: "warehouse", plural: "warehouses" },
};

interface LocationListProps {
  kind: LocationKind;
  items?: LocationListItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (item: { id: string; name: string }) => void;
}

export function LocationList({
  kind,
  items,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
}: LocationListProps) {
  const labels = KIND_LABELS[kind];
  const showActions = Boolean(onEdit || onDelete);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <ErrorState description={`Failed to load ${labels.plural}.`} onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title={`No ${labels.plural} yet`}
            description={`Create your first ${labels.singular} to get started.`}
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
              <TableHead>Location</TableHead>
              <TableHead>Created</TableHead>
              {showActions && <TableHead className="w-[72px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-content">{item.name}</p>
                </TableCell>
                <TableCell className="text-muted">{item.location || "—"}</TableCell>
                <TableCell className="text-muted">
                  {item.created_at ? formatDate(item.created_at) : "—"}
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
                          <DropdownMenuItem onClick={() => onEdit(item.id)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {onEdit && onDelete && <DropdownMenuSeparator />}
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-danger"
                            onClick={() => onDelete({ id: item.id, name: item.name })}
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
