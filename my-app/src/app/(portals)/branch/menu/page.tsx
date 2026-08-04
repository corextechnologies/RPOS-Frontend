"use client";

import { useState } from "react";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageState } from "@/components/ui/page-state";
import {
  useBranchProposals,
  useCreateProposal,
  useWithdrawProposal,
} from "@/lib/hooks/use-menu-proposals";
import { useSubKitchenProducts } from "@/lib/hooks/use-sub-kitchen";
import { minorToDecimalString } from "@/lib/money";
import { STOCK_UNITS, stockUnitLabel, type StockUnit } from "@/lib/stock-unit";
import type { MenuProposal, MenuProposalStatus } from "@/lib/types/menu-proposal";

const STATUS_TONE: Record<MenuProposalStatus, string> = {
  PENDING: "bg-surface-2 text-muted",
  APPROVED: "bg-accent/15 text-accent",
  REJECTED: "bg-danger/10 text-danger",
};

export default function BranchMenuPage() {
  const proposals = useBranchProposals();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-content">
            <UtensilsCrossed className="size-5" aria-hidden />
            Menu proposals
          </h1>
          <p className="text-sm text-muted">
            Propose a dish for the menu. The admin sets the final price and makes it live.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 size-4" aria-hidden />
          Propose item
        </Button>
      </div>

      <PageState
        isLoading={proposals.isLoading}
        isError={proposals.isError}
        data={proposals.data}
        isEmpty={(d) => d.length === 0}
        emptyTitle="No proposals yet"
        emptyDescription="Propose a dish and it will appear here while the admin reviews it."
        onRetry={() => proposals.refetch()}
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((p) => (
              <ProposalRow key={p.id} proposal={p} />
            ))}
          </ul>
        )}
      </PageState>

      {open && <ProposeDialog onClose={() => setOpen(false)} />}
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
              {p.made_to_order && (
                <span className="text-[10px] uppercase tracking-wide text-faint">
                  made to order
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              {minorToDecimalString(p.proposed_price_minor)}
              {p.category ? ` · ${p.category}` : ""}
              {p.product_id
                ? ` · ${p.product_name ?? "existing product"}`
                : ` · new: ${p.new_product_name ?? p.name}`}
            </p>
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

function ProposeDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateProposal();
  const finishedGoods = useSubKitchenProducts("FINISHED_GOOD", { all: true });

  const [source, setSource] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [madeToOrder, setMadeToOrder] = useState(true);
  const [productId, setProductId] = useState("");
  const [sku, setSku] = useState("");
  const [stockUnit, setStockUnit] = useState<StockUnit>("EACH");

  function submit() {
    if (!name.trim() || !/^\d+(\.\d{1,2})?$/.test(price)) return;
    const base = {
      name: name.trim(),
      price,
      category: category.trim() || undefined,
      made_to_order: madeToOrder,
    };
    const input =
      source === "existing"
        ? { ...base, product_id: Number(productId) }
        : { ...base, new_product_name: name.trim(), new_product_sku: sku.trim() || undefined, new_product_stock_unit: stockUnit };
    create.mutate(input, { onSuccess: onClose });
  }

  const canSubmit =
    name.trim() !== "" &&
    /^\d+(\.\d{1,2})?$/.test(price) &&
    (source === "new" || productId !== "");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose a menu item</DialogTitle>
          <DialogDescription>
            The admin reviews it, sets the final price, and publishes it to the live menu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={source === "new" ? "default" : "outline"}
              onClick={() => setSource("new")}
            >
              New dish
            </Button>
            <Button
              type="button"
              variant={source === "existing" ? "default" : "outline"}
              onClick={() => setSource("existing")}
            >
              Existing product
            </Button>
          </div>

          {source === "existing" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a finished good" />
                </SelectTrigger>
                <SelectContent>
                  {(finishedGoods.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="prop-name">
                Name
              </Label>
              <Input id="prop-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="prop-price">
                Price
              </Label>
              <Input
                id="prop-price"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="prop-category">
              Category
            </Label>
            <Input
              id="prop-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Cakes"
            />
          </div>

          {source === "new" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="prop-sku">
                  SKU (optional)
                </Label>
                <Input id="prop-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Stock unit</Label>
                <Select value={stockUnit} onValueChange={(v) => setStockUnit(v as StockUnit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STOCK_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {stockUnitLabel(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
            <div>
              <Label className="text-sm">Made to order</Label>
              <p className="text-xs text-faint">Finished at the sub-kitchen when sold.</p>
            </div>
            <Switch checked={madeToOrder} onCheckedChange={setMadeToOrder} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || create.isPending}>
            {create.isPending ? "Proposing…" : "Propose"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
