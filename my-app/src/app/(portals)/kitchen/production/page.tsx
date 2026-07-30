"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Factory, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageState } from "@/components/ui/page-state";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state";
import { ProduceDialog } from "@/components/kitchen/ProduceDialog";
import { ProductionDateFilter } from "@/components/kitchen/ProductionDateFilter";
import { ProductionTargetProduceCard } from "@/components/kitchen/ProductionTargetProduceCard";
import { ProductionTargetSummaryCard } from "@/components/kitchen/ProductionTargetSummaryCard";
import { useAuth } from "@/lib/auth";
import { useKitchenProduction } from "@/lib/hooks/use-kitchen-recipes";
import { useKitchenProductionTargets } from "@/lib/hooks/use-production-targets";
import { newIdempotencyKey } from "@/lib/pos/idempotency";
import {
  DEFAULT_DATE_FILTER,
  isWithinRange,
  resolveDateRange,
  type DateFilterValue,
  type DateRange,
} from "@/lib/date-range";
import { aggregateRunsByDay, type AggLine } from "@/lib/kitchen/production-summary";
import { formatDate } from "@/lib/utils";

type ProductionView = "target" | "extra" | "made";

const VIEW_OPTIONS: { value: ProductionView; label: string }[] = [
  { value: "target", label: "Production target" },
  { value: "extra", label: "Make something extra" },
  { value: "made", label: "What we made" },
];

/**
 * Making things.
 *
 * A recipe that nothing consumes is decoration — this is the screen that makes
 * it do something. Producing 10 burgers consumes 20 buns and 10 patties from
 * *kitchen* stock and credits 10 burgers back to it.
 *
 * Three views behind one dropdown: work today's forwarded production targets,
 * make something extra off-target, or review what was made.
 */
export default function KitchenProductionPage() {
  const { can } = useAuth();
  const [view, setView] = useState<ProductionView>("target");
  // Shared by the two data views (target + made); ignored by Make something
  // extra, which is an action, not a list. Defaults to today.
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const range = resolveDateRange(dateFilter);

  const isManager = can("kitchen-staff:create");
  const showDateFilter = view !== "extra";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production
          </h1>
          <p className="mt-1 text-sm text-muted">
            What this kitchen made, and what it used up doing it.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {showDateFilter && (
            <ProductionDateFilter value={dateFilter} onChange={setDateFilter} />
          )}
          <Select value={view} onValueChange={(v) => setView(v as ProductionView)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "target" && <ProductionTargetsView allowed={isManager} range={range} />}
      {view === "extra" && <MakeSomethingExtraView canMake={isManager} />}
      {view === "made" && <WhatWeMadeView range={range} />}
    </div>
  );
}

/**
 * Targets in the selected date range, any status. In-production ones are
 * workable cards (make each line, notify Admin); the rest are read-only summaries
 * linking to the target's detail page.
 */
function ProductionTargetsView({
  allowed,
  range,
}: {
  allowed: boolean;
  range: DateRange;
}) {
  const targets = useKitchenProductionTargets(undefined, allowed);
  const inRange = (targets.data ?? [])
    .filter((t) => isWithinRange(t.target_date, range))
    .sort((a, b) => b.target_date.localeCompare(a.target_date));

  return (
    <PageState
      isLoading={targets.isLoading}
      isError={targets.isError}
      data={inRange}
      isEmpty={(rows) => rows.length === 0}
      errorTitle="Couldn't load targets"
      errorDescription={targets.error instanceof Error ? targets.error.message : undefined}
      onRetry={() => targets.refetch()}
      emptyTitle="No targets for this period"
      emptyDescription="Nothing was set for these dates. Try a wider range."
    >
      {(rows) => (
        <div className="space-y-3">
          {rows.map((target) =>
            target.status === "IN_PRODUCTION" ? (
              <ProductionTargetProduceCard key={target.id} target={target} />
            ) : (
              <ProductionTargetSummaryCard key={target.id} target={target} />
            ),
          )}
        </div>
      )}
    </PageState>
  );
}

/** Ad-hoc production not tied to a target. */
function MakeSomethingExtraView({ canMake }: { canMake: boolean }) {
  const [open, setOpen] = useState(false);
  // One key per opening of the dialog (one batch), so a retried produce replays
  // instead of double-crediting; a fresh open mints a fresh key for a new batch.
  const [produceKey, setProduceKey] = useState(() => newIdempotencyKey());

  if (!canMake) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="Not available"
            description="Your role can't start off-target production."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted">
            Make an item off-target — a one-off batch outside today&apos;s targets.
          </p>
          <Button
            onClick={() => {
              setProduceKey(newIdempotencyKey());
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" aria-hidden />
            Make something
          </Button>
        </CardContent>
      </Card>
      <ProduceDialog open={open} onOpenChange={setOpen} idempotencyKey={produceKey} />
    </>
  );
}

/**
 * What the kitchen made, summarised one card per production day: made products
 * summed and ingredients used summed. Runs from any source (branch requests,
 * production targets, make-something-extra) merge, and same-day batches — which
 * share a made-date and so an expiry — collapse into one line each. Different
 * days stay separate cards.
 */
function WhatWeMadeView({ range }: { range: DateRange }) {
  const runs = useKitchenProduction();
  const days = runs.data
    ? aggregateRunsByDay(
        runs.data.filter((r) => r.created_at && isWithinRange(r.created_at, range)),
      )
    : undefined;

  return (
    <PageState
      isLoading={runs.isLoading}
      isError={!!runs.error}
      data={days}
      isEmpty={(rows) => rows.length === 0}
      errorTitle="Couldn't load production"
      errorDescription={runs.error instanceof Error ? runs.error.message : undefined}
      emptyTitle="Nothing made in this period"
      emptyDescription="No production runs fall in these dates. Try a wider range."
    >
      {(rows) => (
        <ul className="space-y-3">
          {rows.map((day) => (
            <li key={day.dateKey} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <Factory className="size-4 text-brand" aria-hidden />
                <p className="text-sm font-medium text-content">
                  {formatDate(day.sampleIso)}
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {day.products.map((product) => (
                  <div key={product.productId} className="grid gap-2 sm:grid-cols-2">
                    <SummaryGroup title="Used" kind="in" items={product.used} />
                    <SummaryGroup
                      title="Made"
                      kind="out"
                      items={[
                        {
                          productId: product.productId,
                          name: product.name,
                          quantity: product.made,
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageState>
  );
}

function SummaryGroup({
  title,
  kind,
  items,
}: {
  title: string;
  kind: "in" | "out";
  items: AggLine[];
}) {
  const Icon = kind === "in" ? ArrowDown : ArrowUp;

  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        <Icon className="size-3" aria-hidden />
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((l) => (
          <li key={l.productId} className="flex justify-between text-sm">
            <span className="text-content">{l.name}</span>
            <span className="tabular-nums text-muted">{l.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
