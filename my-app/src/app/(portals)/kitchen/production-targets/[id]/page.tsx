"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, CircleCheck, Factory, Send, Truck } from "lucide-react";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { ProductionTargetDetail } from "@/components/production-targets/ProductionTargetDetail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import {
  useAcknowledgeProductionTarget,
  useCompleteProductionTarget,
  useDispatchProductionTarget,
  useKitchenProductionTarget,
  useMarkProductionLineProduced,
  useStartProductionTarget,
} from "@/lib/hooks/use-production-targets";
import { PRODUCT_KIND_LABEL, productKindBadgeVariant } from "@/lib/product-kind";
import { allLinesProduced, isMadeLine } from "@/lib/production-targets/lifecycle";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import type { ProductionTarget } from "@/lib/types/production-target";

export default function KitchenProductionTargetDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const allowed = can("kitchen-production-targets:read");
  const canUpdate = can("kitchen-production-targets:update");

  const { data, isLoading, isError, error, refetch } = useKitchenProductionTarget(
    allowed ? params.id : null,
  );

  if (!allowed) return <KitchenNoAccess />;
  if (isMissingKitchenAssignment(error)) return <KitchenUnassigned />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kitchen/production-targets" aria-label="Back">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production target
          </h1>
          <p className="text-sm text-muted">{data ? data.target_date : "Loading…"}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Couldn't load this target."
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <ProductionTargetDetail target={data} />
          {canUpdate && <KitchenActions target={data} />}
        </>
      )}
    </div>
  );
}

/** The kitchen's stage-specific controls. Only ever one card is relevant. */
function KitchenActions({ target }: { target: ProductionTarget }) {
  const acknowledge = useAcknowledgeProductionTarget();
  const start = useStartProductionTarget();
  const complete = useCompleteProductionTarget();
  const dispatch = useDispatchProductionTarget();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmDispatch, setConfirmDispatch] = useState(false);

  switch (target.status) {
    case "PENDING":
      return (
        <ActionCard
          title="Acknowledge"
          description="Confirm the kitchen has seen this target and will make it. Admin is notified."
        >
          <Button
            onClick={() => acknowledge.mutate(target.id)}
            disabled={acknowledge.isPending}
          >
            <Check className="mr-1.5 size-4" aria-hidden />
            Acknowledge target
          </Button>
        </ActionCard>
      );

    case "ACKNOWLEDGED":
      return (
        <ActionCard
          title="Start production"
          description="Begin making this target. You'll then mark each product ready — made items first, then resale items for dispatch."
        >
          <Button onClick={() => start.mutate(target.id)} disabled={start.isPending}>
            <Factory className="mr-1.5 size-4" aria-hidden />
            Start production
          </Button>
        </ActionCard>
      );

    case "IN_PRODUCTION":
      return (
        <ProductionChecklist
          target={target}
          onComplete={() => setConfirmComplete(true)}
          completing={complete.isPending}
          confirmOpen={confirmComplete}
          onConfirmOpenChange={setConfirmComplete}
          onConfirmComplete={async () => {
            try {
              await complete.mutateAsync(target.id);
              setConfirmComplete(false);
            } catch {
              setConfirmComplete(false);
            }
          }}
        />
      );

    case "COMPLETED":
      return (
        <ActionCard
          title="Waiting on Admin"
          description="This target is complete. Admin allocates the produced quantities across branches — you'll dispatch once that's done."
        />
      );

    case "ALLOCATED":
      return (
        <>
          <ActionCard
            title="Dispatch to branches"
            description="Ship the allocated quantities. Each branch then confirms receipt on its Incoming screen."
          >
            <Button
              onClick={() => setConfirmDispatch(true)}
              disabled={dispatch.isPending}
            >
              <Truck className="mr-1.5 size-4" aria-hidden />
              Dispatch to branches
            </Button>
          </ActionCard>
          <ConfirmDialog
            open={confirmDispatch}
            onOpenChange={setConfirmDispatch}
            title="Dispatch this target?"
            description="The allocated quantities are sent to each branch to receive. This can't be undone."
            confirmLabel="Dispatch"
            loading={dispatch.isPending}
            onConfirm={async () => {
              try {
                await dispatch.mutateAsync(target.id);
                setConfirmDispatch(false);
              } catch {
                setConfirmDispatch(false);
              }
            }}
          />
        </>
      );

    case "DISPATCHED":
      return (
        <ActionCard
          title="Dispatched"
          description="On its way to the branches. Each confirms receipt on its Incoming screen; the target is done once all have."
        />
      );

    case "RECEIVED":
      return <p className="text-sm text-muted">Every branch has received this target.</p>;

    default:
      return null;
  }
}

/**
 * The In-production checklist. Made items and resale items read differently
 * ("Mark made" vs "Set aside") but flip the same `produced` flag. Completing is
 * gated until every line is ready.
 */
function ProductionChecklist({
  target,
  onComplete,
  completing,
  confirmOpen,
  onConfirmOpenChange,
  onConfirmComplete,
}: {
  target: ProductionTarget;
  onComplete: () => void;
  completing: boolean;
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  onConfirmComplete: () => void;
}) {
  const markLine = useMarkProductionLineProduced();
  const ready = allLinesProduced(target.lines);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>In production</CardTitle>
          <CardDescription>
            Mark each product once it&apos;s made (or set aside, for resale items).
            Complete the target when everything is ready — Admin is notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {target.lines.map((line) => (
              <li
                key={line.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-content">
                      {line.quantity}× {line.product_name}
                    </span>
                    <Badge variant={productKindBadgeVariant(line.kind)}>
                      {PRODUCT_KIND_LABEL[line.kind]}
                    </Badge>
                  </div>
                </div>
                {line.produced ? (
                  <Badge variant="success">
                    <Check className="mr-1 size-3.5" aria-hidden />
                    Ready
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={markLine.isPending}
                    onClick={() =>
                      markLine.mutate({ id: target.id, lineId: line.id })
                    }
                  >
                    {isMadeLine(line) ? "Mark made" : "Set aside"}
                  </Button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted">
              {ready
                ? "All products ready."
                : "Mark every product ready to complete."}
            </p>
            <Button onClick={onComplete} disabled={!ready || completing}>
              <CircleCheck className="mr-1.5 size-4" aria-hidden />
              Complete &amp; notify Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={onConfirmOpenChange}
        title="Complete this target?"
        description="This tells Admin everything is ready to allocate across branches. It can't be undone."
        confirmLabel="Complete target"
        loading={completing}
        onConfirm={onConfirmComplete}
      />
    </>
  );
}

function ActionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
