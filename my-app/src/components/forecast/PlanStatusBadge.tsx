import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/lib/forecast/format";
import type { ForecastPlanStatus } from "@/lib/types/forecast";

const LABELS: Record<ForecastPlanStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const VARIANTS: Record<ForecastPlanStatus, BadgeVariant> = {
  DRAFT: "secondary",
  CONFIRMED: "success",
  CANCELLED: "outline",
};

export function PlanStatusBadge({ status }: { status: ForecastPlanStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
