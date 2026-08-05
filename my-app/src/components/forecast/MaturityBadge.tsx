import { Badge } from "@/components/ui/badge";
import { MATURITY_LABELS, MATURITY_VARIANTS } from "@/lib/forecast/format";
import type { ForecastMaturity } from "@/lib/types/forecast";

/**
 * The trust badge (§6b). `observed_days` is surfaced as a tooltip so the label
 * stays short but the exact count is one hover away.
 */
export function MaturityBadge({
  maturity,
  observedDays,
  engine,
}: {
  maturity: ForecastMaturity;
  observedDays?: number;
  /** Always "heuristic" today — surfaced in the tooltip, never branched on (§13). */
  engine?: string;
}) {
  const title = [
    observedDays != null ? `${observedDays} day(s) of sales` : null,
    engine ? `engine: ${engine}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Badge variant={MATURITY_VARIANTS[maturity]} title={title || undefined}>
      {MATURITY_LABELS[maturity]}
    </Badge>
  );
}
