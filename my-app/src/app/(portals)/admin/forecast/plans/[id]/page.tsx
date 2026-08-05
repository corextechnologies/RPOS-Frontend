"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/ui/page-state";
import { PlanLinesEditor } from "@/components/forecast/PlanLinesEditor";
import { PlanStatusBadge } from "@/components/forecast/PlanStatusBadge";
import { useBranches } from "@/lib/hooks/use-locations";
import {
  useCancelPlan,
  useConfirmPlan,
  useForecastPlan,
} from "@/lib/hooks/use-forecast-plans";

/**
 * Admin — plan detail (§7). Accept/override the lines, then Confirm — the moment
 * a suggestion becomes a target the branch and kitchen see. Confirm is gated by
 * a dialog and can't be undone by editing; to change a confirmed plan you
 * Cancel and re-plan (there is no edit path, by design).
 */
export default function AdminPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const planId = Number(params.id);
  const plan = useForecastPlan(Number.isFinite(planId) ? planId : null);
  const branches = useBranches();

  const confirmPlan = useConfirmPlan();
  const cancelPlan = useCancelPlan();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const branchName = useMemo(() => {
    const names = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
    return (id: number) => names.get(String(id)) ?? `Branch ${id}`;
  }, [branches.data]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/forecast/plans"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-content"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All plans
      </Link>

      <PageState
        isLoading={plan.isLoading}
        isError={plan.isError}
        data={plan.data}
        errorTitle="Couldn't load this plan"
        errorDescription={plan.error instanceof Error ? plan.error.message : undefined}
        onRetry={() => plan.refetch()}
      >
        {(data) => (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-xl font-semibold tracking-tight text-content">
                      {branchName(data.branch_id)}
                    </h1>
                    <PlanStatusBadge status={data.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {data.starts_on} → {data.ends_on} · {data.lines.length} line
                    {data.lines.length === 1 ? "" : "s"}
                    {data.overridden_lines > 0 ? ` · ${data.overridden_lines} overridden` : ""}
                    {data.engine ? ` · ${data.engine}` : ""}
                    {data.confirmed_at ? ` · confirmed ${formatWhen(data.confirmed_at)}` : ""}
                  </p>
                  {data.note && <p className="text-sm text-muted">“{data.note}”</p>}
                </div>

                <div className="flex items-center gap-2">
                  {data.status === "DRAFT" && (
                    <>
                      <Button variant="ghost" onClick={() => setCancelOpen(true)}>
                        Discard
                      </Button>
                      <Button onClick={() => setConfirmOpen(true)}>Confirm plan</Button>
                    </>
                  )}
                  {data.status === "CONFIRMED" && (
                    <Button variant="outline" onClick={() => setCancelOpen(true)}>
                      Cancel plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <PlanLinesEditor plan={data} />

            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Confirm this plan?"
              description="It notifies branch and kitchen managers and becomes their target. It can't be undone by editing — to change it later you'll cancel and re-plan."
              confirmLabel="Confirm plan"
              loading={confirmPlan.isPending}
              onConfirm={async () => {
                await confirmPlan.mutateAsync(data.id);
                setConfirmOpen(false);
              }}
            />

            <ConfirmDialog
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              title={data.status === "DRAFT" ? "Discard this draft?" : "Cancel this plan?"}
              description={
                data.status === "DRAFT"
                  ? "The draft will be withdrawn. Nothing has been sent to branches or the kitchen yet."
                  : "Kitchen and Branch stop seeing it immediately. The record is kept — to change it, create a new plan."
              }
              confirmLabel={data.status === "DRAFT" ? "Discard" : "Cancel plan"}
              destructive
              loading={cancelPlan.isPending}
              onConfirm={async () => {
                await cancelPlan.mutateAsync(data.id);
                setCancelOpen(false);
              }}
            />
          </>
        )}
      </PageState>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
