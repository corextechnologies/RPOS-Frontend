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
import type { Employee } from "@/lib/types/admin";
import { formatDate, titleCase } from "@/lib/utils";

interface EmployeeListProps {
  items?: Employee[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  locationLabel: (employee: Employee) => string;
}

export function EmployeeList({
  items,
  isLoading,
  isError,
  onRetry,
  locationLabel,
}: EmployeeListProps) {
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
          <ErrorState description="Failed to load employees." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No employees yet"
            description="Managers and staff for this restaurant will appear here."
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
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <p className="font-medium text-content">{employee.full_name}</p>
                </TableCell>
                <TableCell className="text-muted">{employee.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatRole(employee.role)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={employee.is_active ? "success" : "destructive"}>
                    {employee.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted">{locationLabel(employee)}</TableCell>
                <TableCell className="text-muted">
                  {employee.created_at ? formatDate(employee.created_at) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((part) => titleCase(part.toLowerCase()))
    .join(" ");
}
