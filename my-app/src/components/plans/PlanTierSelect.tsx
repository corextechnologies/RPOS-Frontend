"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLAN_CATALOG } from "@/lib/plans/catalog";

interface PlanTierSelectProps {
  value: string;
  onValueChange: (tier: string) => void;
}

export function PlanTierSelect({ value, onValueChange }: PlanTierSelectProps) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder="Select a plan" />
      </SelectTrigger>
      <SelectContent>
        {PLAN_CATALOG.map((plan) => (
          <SelectItem key={plan.tier} value={plan.tier}>
            {plan.label} — ${plan.amount}/mo
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
