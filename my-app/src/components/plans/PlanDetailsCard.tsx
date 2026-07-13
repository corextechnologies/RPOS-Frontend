"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planByTier } from "@/lib/plans/catalog";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { formatDate } from "@/lib/utils";

interface PlanDetailsCardProps {
  planTier: string;
  planAmount?: string | number | null;
  branchLimit?: number | null;
  nextBillingDate?: string | null;
}

export function PlanDetailsCard({
  planTier,
  planAmount,
  branchLimit,
  nextBillingDate,
}: PlanDetailsCardProps) {
  const catalog = planByTier(planTier);
  const amount = planAmount ?? catalog?.amount ?? null;
  const branches = branchLimit ?? catalog?.branchLimit ?? null;

  return (
    <Card className="border-dashed bg-surface-2/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted">Plan details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-faint">Amount</p>
          <p className="mt-1 font-medium text-content">
            {amount != null ? `$${formatPlanAmount(amount)} / month` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-faint">Branch limit</p>
          <p className="mt-1 font-medium text-content">{branches ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-faint">Next billing date</p>
          <p className="mt-1 font-medium text-content">
            {nextBillingDate ? formatDate(nextBillingDate) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-muted">Auto-set from the selected plan</p>
        </div>
      </CardContent>
    </Card>
  );
}
