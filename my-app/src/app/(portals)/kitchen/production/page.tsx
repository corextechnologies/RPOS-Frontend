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
import { ProductionTargetProduceCard } from "@/components/kitchen/ProductionTargetProduceCard";
import { useAuth } from "@/lib/auth";
import { useKitchenProduction } from "@/lib/hooks/use-kitchen-recipes";
import { useKitchenProductionTargets } from "@/lib/hooks/use-production-targets";
import { formatDate } from "@/lib/utils";
import type { ProductionLineRole } from "@/lib/types/branch";

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

  const isManager = can("kitchen-staff:create");

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

      {view === "target" && <ProductionTargetsView allowed={isManager} />}
      {view === "extra" && <MakeSomethingExtraView canMake={isManager} />}
      {view === "made" && <WhatWeMadeView />}
    </div>
  );
}

/** In-production targets, each a collapsible card worked line by line. */
function ProductionTargetsView({ allowed }: { allowed: boolean }) {
  const targets = useKitchenProductionTargets(undefined, allowed);
  const inProduction = (targets.data ?? []).filter(
    (t) => t.status === "IN_PRODUCTION",
  );

  return (
    <PageState
      isLoading={targets.isLoading}
      isError={targets.isError}
      data={inProduction}
      isEmpty={(rows) => rows.length === 0}
      errorTitle="Couldn't load targets"
      errorDescription={targets.error instanceof Error ? targets.error.message : undefined}
      onRetry={() => targets.refetch()}
      emptyTitle="Nothing in production"
      emptyDescription="Start a production target to work it here. Targets Admin forwards appear under Production targets."
    >
      {(rows) => (
        <div className="space-y-3">
          {rows.map((target) => (
            <ProductionTargetProduceCard key={target.id} target={target} />
          ))}
        </div>
      )}
    </PageState>
  );
}

/** Ad-hoc production not tied to a target. */
function MakeSomethingExtraView({ canMake }: { canMake: boolean }) {
  const [open, setOpen] = useState(false);

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
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 size-4" aria-hidden />
            Make something
          </Button>
        </CardContent>
      </Card>
      <ProduceDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Every production run, with what it consumed and what it made. */
function WhatWeMadeView() {
  const runs = useKitchenProduction();

  return (
    <PageState
      isLoading={runs.isLoading}
      isError={!!runs.error}
      data={runs.data}
      isEmpty={(rows) => rows.length === 0}
      errorTitle="Couldn't load production"
      errorDescription={runs.error instanceof Error ? runs.error.message : undefined}
      emptyTitle="Nothing made yet"
      emptyDescription="Producing an item consumes its recipe's ingredients from kitchen stock."
    >
      {(rows) => (
        <ul className="space-y-3">
          {rows.map((run) => {
            const output = run.lines.find((l) => l.role === "OUTPUT");
            return (
              <li key={run.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-content">
                    <Factory className="size-4 text-brand" aria-hidden />
                    {output ? `${output.quantity}× ${output.product_name}` : "Run"}
                  </p>
                  <p className="text-xs text-muted">{formatDate(run.created_at)}</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <LineGroup title="Used" role="INPUT" lines={run.lines} />
                  <LineGroup title="Made" role="OUTPUT" lines={run.lines} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageState>
  );
}

function LineGroup({
  title,
  role,
  lines,
}: {
  title: string;
  role: ProductionLineRole;
  lines: { id: string; product_name?: string; role: ProductionLineRole; quantity: number }[];
}) {
  const rows = lines.filter((l) => l.role === role);
  const Icon = role === "INPUT" ? ArrowDown : ArrowUp;

  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        <Icon className="size-3" aria-hidden />
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((l) => (
          <li key={l.id} className="flex justify-between text-sm">
            <span className="text-content">{l.product_name ?? l.id}</span>
            <span className="tabular-nums text-muted">{l.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
