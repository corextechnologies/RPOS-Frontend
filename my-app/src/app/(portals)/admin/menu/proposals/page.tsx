"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import { useAdminProposals, useApproveProposal, useRejectProposal } from "@/lib/hooks/use-menu-proposals";
import { menuProposalApi } from "@/lib/api/menu-proposals.api";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { posErrorMessage } from "@/lib/api/errors";
import { draftFromMenu, publishDraft, type DraftItem } from "@/lib/pos/menu-draft";
import { minorToDecimalString } from "@/lib/money";
import type { MenuProposal } from "@/lib/types/menu-proposal";

export default function AdminMenuProposalsPage() {
  const pending = useAdminProposals("PENDING");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-content">
          <ClipboardCheck className="size-5" aria-hidden />
          Menu proposals
        </h1>
        <p className="text-sm text-muted">
          Dishes branches proposed for the menu. Approving sets the price, creates the
          product if new, and publishes it to the live menu.
        </p>
      </div>

      <PageState
        isLoading={pending.isLoading}
        isError={pending.isError}
        data={pending.data}
        isEmpty={(d) => d.length === 0}
        emptyTitle="No pending proposals"
        emptyDescription="When a branch proposes a dish, it lands here for review."
        onRetry={() => pending.refetch()}
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((p) => (
              <ProposalRow key={p.id} proposal={p} />
            ))}
          </ul>
        )}
      </PageState>
    </div>
  );
}

function ProposalRow({ proposal: p }: { proposal: MenuProposal }) {
  const approve = useApproveProposal();
  const reject = useRejectProposal();
  const [rejecting, setRejecting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [price, setPrice] = useState(minorToDecimalString(p.proposed_price_minor));

  async function approveAndPublish() {
    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
      toast.error("Set a price like 250.00");
      return;
    }
    setPublishing(true);
    try {
      // 1) Approve — resolves/creates the FINISHED_GOOD product and sets the price.
      const approved = await approve.mutateAsync({ id: p.id, input: { price } });
      if (approved.product_id == null) throw new Error("Approved proposal has no product.");
      // 2) Compose a new published version = the live menu + this dish, and publish.
      const menu = await posAdminApi.publishedMenu().catch(() => null);
      const draft = menu
        ? draftFromMenu(menu)
        : { groups: [], items: [] };
      const item: DraftItem = {
        tempId: `proposal-${p.id}`,
        name: approved.name,
        price,
        product_id: approved.product_id,
        category: approved.category ?? undefined,
        made_to_order: approved.made_to_order,
        is_combo: false,
        componentTempIds: [],
        groupTempIds: [],
      };
      await publishDraft({ ...draft, items: [...draft.items, item] }, posAdminApi);
      toast.success(`“${approved.name}” is live on the menu.`);
    } catch (err) {
      // The proposal is already APPROVED even if publish failed — say so, so the
      // admin finishes it from the Menu editor rather than re-approving.
      toast.error(
        `${posErrorMessage(err)} The item is approved; publish it from Menu.`,
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <li>
      <Card>
        <CardContent className="space-y-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-content">{p.name}</span>
                {p.made_to_order && (
                  <Badge className="bg-accent/15 text-accent">made to order</Badge>
                )}
              </div>
              <p className="text-sm text-muted">
                Proposed {minorToDecimalString(p.proposed_price_minor)}
                {p.category ? ` · ${p.category}` : ""}
                {p.product_id
                  ? ` · ${p.product_name ?? "existing product"}`
                  : ` · new product: ${p.new_product_name ?? p.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor={`price-${p.id}`}>
                Final price
              </Label>
              <Input
                id={`price-${p.id}`}
                className="h-9 w-28"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <Button onClick={approveAndPublish} disabled={publishing || approve.isPending}>
              {publishing ? "Publishing…" : "Approve & publish"}
            </Button>
            <Button variant="outline" onClick={() => setRejecting(true)}>
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      {rejecting && (
        <RejectDialog
          name={p.name}
          pending={reject.isPending}
          onCancel={() => setRejecting(false)}
          onReject={(reason) =>
            reject.mutate({ id: p.id, reason }, { onSuccess: () => setRejecting(false) })
          }
        />
      )}
    </li>
  );
}

function RejectDialog({
  name,
  pending,
  onCancel,
  onReject,
}: {
  name: string;
  pending: boolean;
  onCancel: () => void;
  onReject: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject “{name}”</DialogTitle>
          <DialogDescription>The branch sees this reason on their proposal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="reject-reason">
            Reason
          </Label>
          <Input
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Off-brand for this season"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onReject(reason.trim())}
            disabled={pending || reason.trim() === ""}
          >
            {pending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
