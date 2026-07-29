"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Factory, Send } from "lucide-react";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { ProductionTargetDetail } from "@/components/production-targets/ProductionTargetDetail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import {
  useAcknowledgeProductionTarget,
  useKitchenProductionTarget,
  useStartProductionTarget,
} from "@/lib/hooks/use-production-targets";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import type { ProductionTarget } from "@/lib/types/production-target";

export default function KitchenProductionTargetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const allowed = can("kitchen-production-targets:read");
  const canUpdate = can("kitchen-production-targets:update");

  const { data, isLoading, isError, error, refetch } = useKitchenProductionTarget(
    allowed ? params.id : null,
  );

  // Once a target is in production, the work happens on the Production page.
  // Landing on (or starting) an IN_PRODUCTION target sends the user there.
  const inProduction = data?.status === "IN_PRODUCTION";
  useEffect(() => {
    if (inProduction) router.replace("/kitchen/production");
  }, [inProduction, router]);

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

      {isLoading || inProduction ? (
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
          {canUpdate && (
            <KitchenActions
              target={data}
              onStarted={() => router.push("/kitchen/production")}
            />
          )}
        </>
      )}
    </div>
  );
}

/** The kitchen's stage-specific controls. Only ever one card is relevant. */
function KitchenActions({
  target,
  onStarted,
}: {
  target: ProductionTarget;
  onStarted: () => void;
}) {
  const acknowledge = useAcknowledgeProductionTarget();
  const start = useStartProductionTarget();

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
          description="Begin making this target. You'll produce each product on the Production page — made items first, then resale items for dispatch."
        >
          <Button
            onClick={() =>
              start.mutate(target.id, { onSuccess: () => onStarted() })
            }
            disabled={start.isPending}
          >
            <Factory className="mr-1.5 size-4" aria-hidden />
            Start production
          </Button>
        </ActionCard>
      );

    case "COMPLETED":
    case "ALLOCATED":
    case "DISPATCHED":
    case "RECEIVED":
      return (
        <Card>
          <CardContent className="py-6 text-center space-y-3">
            <p className="text-sm text-muted">
              This target has been completed and moved to the Dispatch to Admin section.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/kitchen/requests/dispatch/target/${target.id}`}>
                <Send className="mr-1.5 size-4" aria-hidden />
                View in Dispatch to Admin
              </Link>
            </Button>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
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
