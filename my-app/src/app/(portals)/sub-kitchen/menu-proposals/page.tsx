"use client";

import { useState } from "react";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/ui/page-state";
import {
  useChefProposals,
  useCreateProposal,
  useWithdrawProposal,
} from "@/lib/hooks/use-menu-proposals";
import type { MenuProposal, MenuProposalStatus } from "@/lib/types/menu-proposal";

const STATUS_TONE: Record<MenuProposalStatus, string> = {
  PENDING: "bg-surface-2 text-muted",
  APPROVED: "bg-accent/15 text-accent",
  REJECTED: "bg-danger/10 text-danger",
};

export default function SubKitchenMenuProposalsPage() {
  const proposals = useChefProposals();
  const create = useCreateProposal();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  function submit() {
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), category: category.trim() || undefined },
      {
        onSuccess: () => {
          setName("");
          setCategory("");
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-content">
          <UtensilsCrossed className="size-5" aria-hidden />
          Propose a dish
        </h1>
        <p className="text-sm text-muted">
          Suggest something the sub-kitchen can make. Just the name and a category —
          the admin sets the price and puts it on the menu.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="dish-name">
                Dish name
              </Label>
              <Input
                id="dish-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="e.g. Chocolate Fudge Cake"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="dish-category">
                Category
              </Label>
              <Input
                id="dish-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="e.g. Desserts"
              />
            </div>
            <Button onClick={submit} disabled={!name.trim() || create.isPending}>
              <Plus className="mr-1 size-4" aria-hidden />
              Propose
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-content">Your proposals</h2>
        <PageState
          isLoading={proposals.isLoading}
          isError={proposals.isError}
          data={proposals.data}
          isEmpty={(d) => d.length === 0}
          emptyTitle="No proposals yet"
          emptyDescription="Propose a dish above and track its status here."
          onRetry={() => proposals.refetch()}
        >
          {(rows) => (
            <ul className="space-y-2">
              {rows.map((p) => (
                <ProposalRow key={p.id} proposal={p} />
              ))}
            </ul>
          )}
        </PageState>
      </div>
    </div>
  );
}

function ProposalRow({ proposal: p }: { proposal: MenuProposal }) {
  const withdraw = useWithdrawProposal();
  return (
    <li>
      <Card>
        <CardContent className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-content">{p.name}</span>
              <Badge className={STATUS_TONE[p.status]}>{p.status}</Badge>
            </div>
            {p.category && <p className="text-sm text-muted">{p.category}</p>}
            {p.status === "REJECTED" && p.reject_reason && (
              <p className="mt-1 text-xs italic text-danger">“{p.reject_reason}”</p>
            )}
          </div>
          {p.status === "PENDING" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => withdraw.mutate(p.id)}
              disabled={withdraw.isPending}
              aria-label={`Withdraw ${p.name}`}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
