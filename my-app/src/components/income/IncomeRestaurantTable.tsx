"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IncomeRestaurantRow } from "@/lib/types/income";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { formatDate, titleCase } from "@/lib/utils";

export function IncomeRestaurantTable({ rows }: { rows: IncomeRestaurantRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">By restaurant</CardTitle>
        <CardDescription>Period collections and outstanding balances per tenant.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState
            title="No restaurants"
            description="No restaurant income rows for this period."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Onboarded</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.restaurant_id}>
                      <TableCell>
                        <p className="font-medium">{r.restaurant_name}</p>
                        <p className="text-xs text-muted">{r.owner_contact_email || "-"}</p>
                      </TableCell>
                      <TableCell>
                        {r.plan_tier ? titleCase(r.plan_tier) : "-"}
                        {r.plan_amount != null && (
                          <span className="text-muted"> · ${formatPlanAmount(r.plan_amount)}</span>
                        )}
                      </TableCell>
                      <TableCell>${formatPlanAmount(r.collected)}</TableCell>
                      <TableCell>${formatPlanAmount(r.outstanding)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "ACTIVE" ? "success" : "warning"}>
                          {titleCase(r.status.toLowerCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.onboarded_on ? formatDate(r.onboarded_on) : "-"}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/super-admin/restaurants/${r.restaurant_id}/billing`}>
                            Billing
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {rows.map((r) => (
                <Card key={r.restaurant_id}>
                  <CardContent className="space-y-3 p-4">
                    <div>
                      <p className="font-medium">{r.restaurant_name}</p>
                      <p className="text-xs text-muted">{r.owner_contact_email || "-"}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Collected</span>
                      <span>${formatPlanAmount(r.collected)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Outstanding</span>
                      <span>${formatPlanAmount(r.outstanding)}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/super-admin/restaurants/${r.restaurant_id}/billing`}>
                        View billing
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
