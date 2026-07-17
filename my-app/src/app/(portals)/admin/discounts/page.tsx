"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageState } from "@/components/ui/page-state";
import { useAdminDiscountRules, useCreateAdminDiscountRule } from "@/lib/hooks/use-pos-admin";
import { formatBasisPoints } from "@/lib/money";
import type { DiscountType } from "@/lib/types/pos";

/**
 * Discount rules.
 *
 * `value_bp` and `max_pct_bp` are **basis points** — 5000 is 50%. The form takes
 * percentages because nobody thinks in basis points, and converts once on
 * submit. Storing bp is the same trick as minor units: integers, no rounding
 * surprises on a value that ends up multiplying money.
 *
 * `max_pct_bp` is the ceiling a cashier can apply unaided. Above it the till
 * gets 403 `discount_needs_approval` and prompts for a manager — so this field
 * is the whole fraud control, not a nicety.
 */
export default function AdminDiscountsPage() {
  const { data, isLoading, error } = useAdminDiscountRules();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Discounts
          </h1>
          <p className="mt-1 text-sm text-muted">
            What the tills may take off a bill, and who can approve it.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          New rule
        </Button>
      </div>

      <PageState
        isLoading={isLoading}
        isError={!!error}
        data={data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load discount rules"
        errorDescription={error instanceof Error ? error.message : undefined}
        emptyTitle="No discount rules"
        emptyDescription="Until you add one, tills can't discount anything."
      >
        {(rows) => (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Needs approval over</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <span className="font-medium text-content">{rule.name}</span>
                        {rule.is_active === false && (
                          <Badge variant="outline" className="ml-2">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted">{rule.code}</TableCell>
                      <TableCell className="tabular-nums text-content">
                        {rule.type === "PCT" ? formatBasisPoints(rule.value_bp) : "Fixed amount"}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted">
                        {rule.max_pct_bp != null ? formatBasisPoints(rule.max_pct_bp) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageState>

      <NewRuleDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewRuleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateAdminDiscountRule();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<DiscountType>("PCT");
  const [value, setValue] = useState("");
  const [maxPct, setMaxPct] = useState("");

  /** Percent in the UI, basis points on the wire. 50 -> 5000. */
  const toBp = (pct: string) => Math.round(parseFloat(pct) * 100);

  const valid = code.trim() && name.trim() && /^\d+(\.\d{1,2})?$/.test(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New discount rule</DialogTitle>
          <DialogDescription>Tills apply this by code.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="d-name">Name</Label>
            <Input
              id="d-name"
              autoFocus
              placeholder="Staff 50%"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="d-code">Code</Label>
            <Input
              id="d-code"
              placeholder="STAFF50"
              className="font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PCT">Percentage</SelectItem>
                <SelectItem value="AMOUNT">Fixed amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="d-value">{type === "PCT" ? "Percent off" : "Amount off"}</Label>
            <Input
              id="d-value"
              inputMode="decimal"
              placeholder={type === "PCT" ? "50" : "100.00"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="d-max">Approval needed over (%)</Label>
            <Input
              id="d-max"
              inputMode="decimal"
              placeholder="10"
              value={maxPct}
              onChange={(e) => setMaxPct(e.target.value)}
            />
            <p className="text-xs text-faint">
              Above this a cashier must get a manager&apos;s PIN. Leave empty for no limit.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  code: code.trim(),
                  name: name.trim(),
                  type,
                  value_bp: toBp(value),
                  max_pct_bp: maxPct ? toBp(maxPct) : null,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setCode("");
                    setName("");
                    setValue("");
                    setMaxPct("");
                  },
                },
              )
            }
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
