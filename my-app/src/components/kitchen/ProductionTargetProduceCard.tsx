"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Send, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProduceDialog } from "@/components/kitchen/ProduceDialog";
import {
  useCompleteProductionTarget,
  useMarkProductionLineProduced,
} from "@/lib/hooks/use-production-targets";
import { allLinesProduced, isMadeLine } from "@/lib/production-targets/lifecycle";
import { PRODUCT_KIND_LABEL, productKindBadgeVariant } from "@/lib/product-kind";
import { cn } from "@/lib/utils";
import type {
  ProductionTarget,
  ProductionTargetLine,
} from "@/lib/types/production-target";

/**
 * An IN_PRODUCTION target, worked from the Production page. Collapsed it is just
 * "Production target — <date>"; expanded it lists the lines. Made items open the
 * "Make something" dialog (a real production run) before the line is marked
 * ready; resale items are simply set aside. "Notify Admin" completes the target
 * once every line is ready, then hands off to Dispatch to Admin.
 */
export function ProductionTargetProduceCard({ target }: { target: ProductionTarget }) {
  const router = useRouter();
  const markLine = useMarkProductionLineProduced();
  const complete = useCompleteProductionTarget();

  const [expanded, setExpanded] = useState(false);
  const [producingLine, setProducingLine] = useState<ProductionTargetLine | null>(null);

  const ready = allLinesProduced(target.lines);
  const madeCount = target.lines.filter((l) => l.produced).length;

  const markReady = (lineId: string) =>
    markLine.mutate({ id: target.id, lineId });

  const notifyAdmin = async () => {
    try {
      await complete.mutateAsync(target.id);
      router.push("/kitchen/requests/dispatch");
    } catch {
      // The hook surfaces the error toast; stay put so it can be retried.
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2.5">
            <Target className="size-4 text-brand" aria-hidden />
            <span className="font-medium text-content">Production target</span>
            <span className="text-sm text-muted">{target.target_date}</span>
          </span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-muted tabular-nums">
              {madeCount}/{target.lines.length} ready
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-faint transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-line p-4">
            <ul className="space-y-2">
              {target.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-content">
                      {line.quantity}× {line.product_name}
                    </span>
                    <Badge variant={productKindBadgeVariant(line.kind)}>
                      {PRODUCT_KIND_LABEL[line.kind]}
                    </Badge>
                  </div>
                  {line.produced ? (
                    <Badge variant="success">
                      <Check className="mr-1 size-3.5" aria-hidden />
                      Ready
                    </Badge>
                  ) : isMadeLine(line) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProducingLine(line)}
                    >
                      Mark made
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={markLine.isPending}
                      onClick={() => markReady(line.id)}
                    >
                      Set aside
                    </Button>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted">
                {ready
                  ? "All products ready — notify Admin to hand off."
                  : "Make every product to notify Admin."}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setExpanded(false)}>
                  Cancel
                </Button>
                <Button disabled={!ready || complete.isPending} onClick={notifyAdmin}>
                  <Send className="mr-1.5 size-4" aria-hidden />
                  Notify Admin
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <ProduceDialog
        open={producingLine !== null}
        onOpenChange={(o) => {
          if (!o) setProducingLine(null);
        }}
        initialProductId={producingLine?.product_id}
        initialQuantity={producingLine?.quantity}
        initialProductName={producingLine?.product_name}
        lockProduct
        onProduced={() => {
          if (producingLine) markReady(producingLine.id);
          setProducingLine(null);
        }}
      />
    </Card>
  );
}
