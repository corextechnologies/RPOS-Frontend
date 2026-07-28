"use client";

import {
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BranchStaff } from "@/lib/types/branch";
import { formatDate } from "@/lib/utils";

interface BranchStaffTableProps {
  items: BranchStaff[];
  onRowClick?: (staff: BranchStaff) => void;
  onEdit?: (staff: BranchStaff) => void;
  onRevoke?: (staff: BranchStaff) => void;
  onRestore?: (staff: BranchStaff) => void;
  onDelete?: (staff: BranchStaff) => void;
}

/**
 * The branch roster. Mirrors the kitchen and warehouse tables, with two columns
 * they don't have: `position` (the till derives its capability list from it, so
 * a missing one is called out loudly) and login `status`, since branch staff —
 * unlike kitchen and warehouse staff — do sign in.
 */
export function BranchStaffTable({
  items,
  onRowClick,
  onEdit,
  onRevoke,
  onRestore,
  onDelete,
}: BranchStaffTableProps) {
  const showActions = Boolean(onEdit || onRevoke || onRestore || onDelete);

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              {showActions && <TableHead className="w-[72px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((person) => (
              <TableRow
                key={person.id}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? `View ${person.full_name || person.email}` : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={onRowClick ? () => onRowClick(person) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(person);
                        }
                      }
                    : undefined
                }
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <StaffAvatar imageUrl={person.image_url} name={person.full_name} />
                    <p className="font-medium text-content">{person.full_name || "-"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {person.position ? (
                    <Badge variant="secondary">
                      {person.position.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <TriangleAlert className="size-3" aria-hidden />
                      none — can&apos;t use a till
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted">{person.email}</TableCell>
                <TableCell className="text-muted tabular-nums">
                  {person.phone_number || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={person.is_active ? "secondary" : "outline"}>
                    {person.is_active ? "active" : "revoked"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted">
                  {person.created_at ? formatDate(person.created_at) : "-"}
                </TableCell>
                {showActions && (
                  // Stop propagation so opening the menu doesn't also open the
                  // detail dialog behind it.
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(person)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onRevoke && person.is_active && (
                          <DropdownMenuItem onClick={() => onRevoke(person)}>
                            <ShieldOff className="mr-2 h-4 w-4" /> Revoke access
                          </DropdownMenuItem>
                        )}
                        {onRestore && !person.is_active && (
                          <DropdownMenuItem onClick={() => onRestore(person)}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Restore access
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-danger"
                              onClick={() => onDelete(person)}
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
