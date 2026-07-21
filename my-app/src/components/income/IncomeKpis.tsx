"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { cn } from "@/lib/utils";

export function ChangePctBadge({ value }: { value: string | null | undefined }) {
  if (value == null || value === "") {
    return <Badge variant="outline">n/a</Badge>;
  }
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return <Badge variant="outline">n/a</Badge>;
  if (n === 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="h-3 w-3" />
        0%
      </Badge>
    );
  }
  const up = n > 0;
  return (
    <Badge variant={up ? "success" : "warning"} className="gap-1">
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(n).toFixed(2)}%
    </Badge>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  change?: string | null;
  className?: string;
}

export function IncomeKpiCard({ label, value, hint, change, className }: KpiCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
        {change !== undefined && <ChangePctBadge value={change} />}
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-semibold tracking-tight text-content">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function moneyLabel(amount: string | number | null | undefined, suffix = ""): string {
  const formatted = formatPlanAmount(amount);
  if (formatted === "-") return "-";
  return `$${formatted}${suffix}`;
}
