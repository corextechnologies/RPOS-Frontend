"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const approved = useAdminProposals("APPROVED");
  const qc = useQueryClient();
  const [publishing, setPublishing] = useState(false);

  // Approved but not yet on the live menu — the batch to publish. Publishing all
  // of them in ONE new menu version is deliberate: composing the version per-item
  // is a read-modify-write on the shared menu and races, dropping items.
  const toPublish = useMemo(
    () => (approved.data ?? []).filter((p) => !p.published_at),
    [approved.data],
  );

  async function publishApproved() {
    if (toPublish.length === 0) return;
    setPublishing(true);
    try {
      const menu = await posAdminApi.publishedMenu().catch(() => null);
      const draft = menu ? draftFromMenu(menu) : { groups: [], items: [] };
      const onMenu = new Set(
        draft.items.map((i) => i.product_id).filter((x): x is number => x != null),
      );
      const additions: DraftItem[] = toPublish
        .filter((p) => p.product_id != null && !onMenu.has(p.product_id))
        .map((p) => ({
          tempId: `proposal-${p.id}`,
          name: p.name,
          price: minorToDecimalString(p.proposed_price_minor),
          product_id: p.product_id,
          category: p.category ?? undefined,
          made_to_order: p.made_to_order,
          is_combo: false,
          componentTempIds: [],
          groupTempIds: [],
        }));

      await publishDraft({ ...draft, items: [...draft.items, ...additions] }, posAdminApi);
      // Stamp every approved-not-live proposal as published — both the ones we
      // just added and any already on the menu — so the queue clears.
      await menuProposalApi.markProposalsPublished(toPublish.map((p) => p.id));

      qc.invalidateQueries({ queryKey: ["menu-proposals", "admin"] });
      qc.invalidateQueries({ queryKey: ["pos-admin-menu"] });
      toast.success(
        additions.length
          ? `Published ${additions.length} dish${additions.length > 1 ? "es" : ""} to the menu.`
          : "Menu is already up to date.",
      );
    } catch (err) {
      toast.error(posErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-content">
          <ClipboardCheck className="size-5" aria-hidden />
          Menu proposals
        </h1>
        <p className="text-sm text-muted">
          Approve a proposed dish (sets its price and creates the product if new), then
          publish the approved ones to the live menu together.
        </p>
      </div>

      {/* Approved, waiting to go live */}
      {toPublish.length > 0 && (
        <section className="space-y-3 rounded-xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-content">Approved — ready to publish</h2>
              <p className="text-xs text-faint">
                {toPublish.length} dish{toPublish.length > 1 ? "es" : ""} not yet on the live menu.
              </p>
            </div>
            <Button onClick={publishApproved} disabled={publishing}>
              <UploadCloud className="mr-1 size-4" aria-hidden />
              {publishing ? "Publishing…" : `Publish ${toPublish.length} to menu`}
            </Button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {toPublish.map((p) => (
              <li key={p.id}>
                <Badge className="bg-accent/15 text-accent">
                  {p.name} · {minorToDecimalString(p.proposed_price_minor)}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pending review — the chef's proposed dishes. Set a price and add each. */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-content">Pending review</h2>
        <PageState
          isLoading={pending.isLoading}
          isError={pending.isError}
          data={pending.data}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No pending proposals"
          emptyDescription="When a sub-kitchen chef proposes a dish, it lands here for review."
          onRetry={() => pending.refetch()}
        >
          {(rows) => (
            <div className="overflow-x-auto rounded-xl border border-line">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dish</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-32">Price</TableHead>
                    <TableHead className="w-40 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <ProposalRow key={p.id} proposal={p} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PageState>
      </section>
    </div>
  );
}

function ProposalRow({ proposal: p }: { proposal: MenuProposal }) {
  const approve = useApproveProposal();
  const reject = useRejectProposal();
  const [rejecting, setRejecting] = useState(false);
  const [price, setPrice] = useState("");

  function doApprove() {
    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      toast.error("Set a price like 250.00");
      return;
    }
    approve.mutate(
      { id: p.id, input: { price } },
      { onSuccess: () => toast.success(`“${p.name}” added. Publish below to go live.`) },
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-content">{p.name}</TableCell>
      <TableCell className="text-muted">{p.category ?? "—"}</TableCell>
      <TableCell>
        <Input
          aria-label={`Price for ${p.name}`}
          className="h-9 w-24"
          inputMode="decimal"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doApprove()}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={doApprove} disabled={approve.isPending}>
            {approve.isPending ? "Adding…" : "Add"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
            Reject
          </Button>
        </div>
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
      </TableCell>
    </TableRow>
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
