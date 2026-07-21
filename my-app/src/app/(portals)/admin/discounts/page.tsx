"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Calendar,
  Clock,
  Hash,
  Layers,
  MoreHorizontal,
  Pencil,
  Percent,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/ui/page-state";
import {
  useAdminDiscountRules,
  useCreateAdminDiscountRule,
  useUpdateAdminDiscountRule,
  useDeleteAdminDiscountRule,
} from "@/lib/hooks/use-pos-admin";
import { formatBasisPoints } from "@/lib/money";
import type { DayOfWeek, DiscountRule, DiscountType, DiscountScope } from "@/lib/types/pos";

const ALL_DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

function formatScheduleSummary(rule: DiscountRule): string | null {
  const parts: string[] = [];

  if (rule.valid_from || rule.valid_to) {
    const from = rule.valid_from ? new Date(rule.valid_from).toLocaleDateString() : "…";
    const to = rule.valid_to ? new Date(rule.valid_to).toLocaleDateString() : "…";
    parts.push(`${from} – ${to}`);
  }

  if (rule.active_days?.length) {
    const dayLabels = rule.active_days.map(
      (d) => ALL_DAYS.find((ad) => ad.value === d)?.label ?? d,
    );
    parts.push(dayLabels.join(", "));
  }

  if (rule.active_hours_start && rule.active_hours_end) {
    parts.push(`${rule.active_hours_start.slice(0, 5)}–${rule.active_hours_end.slice(0, 5)}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toTimeInputValue(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export default function AdminDiscountsPage() {
  const { data, isLoading, error } = useAdminDiscountRules();
  const [dialogRule, setDialogRule] = useState<DiscountRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRule, setDetailRule] = useState<DiscountRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountRule | null>(null);
  const deleteMutation = useDeleteAdminDiscountRule();

  const openCreate = () => {
    setDialogRule(null);
    setDialogOpen(true);
  };

  const openEdit = (rule: DiscountRule) => {
    setDialogRule(rule);
    setDialogOpen(true);
  };

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
        <Button onClick={openCreate}>
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
                    <TableHead>Scope</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Needs approval over</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="w-12">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((rule) => {
                    const schedule = formatScheduleSummary(rule);
                    return (
                      <TableRow key={rule.id} className="cursor-pointer" onClick={() => setDetailRule(rule)}>
                        <TableCell>
                          <span className="font-medium text-content">{rule.name}</span>
                          {rule.is_active === false && (
                            <Badge variant="outline" className="ml-2">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted">{rule.code}</TableCell>
                        <TableCell className="text-muted">
                          {rule.scope === "LINE" ? "Line item" : "Order"}
                        </TableCell>
                        <TableCell className="tabular-nums text-content">
                          {rule.type === "PCT" ? formatBasisPoints(rule.value_bp) : "Fixed amount"}
                        </TableCell>
                        <TableCell className="tabular-nums text-muted">
                          {rule.max_pct_bp != null ? formatBasisPoints(rule.max_pct_bp) : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] text-xs text-muted">
                          {schedule ? (
                            <span className="flex items-center gap-1.5">
                              <CalendarClock className="size-3.5 shrink-0" />
                              <span className="truncate">{schedule}</span>
                            </span>
                          ) : (
                            "Always"
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${rule.name}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(rule)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-danger"
                                onClick={() => setDeleteTarget(rule)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageState>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={dialogRule}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete discount rule"
        description={`Permanently delete "${deleteTarget?.name}"? Tills will no longer be able to apply this discount.`}
        destructive
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        loading={deleteMutation.isPending}
      />

      <RuleDetailDialog
        rule={detailRule}
        onOpenChange={(open) => !open && setDetailRule(null)}
        onEdit={(r) => {
          setDetailRule(null);
          openEdit(r);
        }}
        onDelete={(r) => {
          setDetailRule(null);
          setDeleteTarget(r);
        }}
      />
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-brand" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-faint">{label}</p>
        <div className="text-sm font-medium text-content">{children}</div>
      </div>
    </div>
  );
}

function RuleDetailDialog({
  rule,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  rule: DiscountRule | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (rule: DiscountRule) => void;
  onDelete: (rule: DiscountRule) => void;
}) {
  if (!rule) return null;

  const hasSchedule = !!(rule.valid_from || rule.valid_to || rule.active_days?.length || (rule.active_hours_start && rule.active_hours_end));

  return (
    <Dialog open={!!rule} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="font-display text-lg font-semibold">{rule.name}</DialogTitle>
              {rule.is_active === false ? (
                <Badge variant="outline">Inactive</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </div>
            <DialogDescription className="mt-0.5 font-mono text-xs">{rule.code}</DialogDescription>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line px-5 py-4">
          <DetailItem icon={Tag} label="Type">
            {rule.type === "PCT" ? "Percentage" : "Fixed amount"}
          </DetailItem>

          <DetailItem icon={Percent} label="Value">
            {rule.type === "PCT" ? formatBasisPoints(rule.value_bp) : `${rule.amount_minor} (minor)`}
          </DetailItem>

          <DetailItem icon={Layers} label="Scope">
            {rule.scope === "LINE" ? "Line item" : "Whole order"}
          </DetailItem>

          <DetailItem icon={ShieldCheck} label="Approval over">
            {rule.max_pct_bp != null ? formatBasisPoints(rule.max_pct_bp) : "No limit"}
          </DetailItem>
        </div>

        {/* Schedule section */}
        <div className="border-t border-line px-5 py-4">
          {hasSchedule ? (
            <div className="space-y-4">
              {(rule.valid_from || rule.valid_to) && (
                <div className="grid grid-cols-2 gap-x-4">
                  <DetailItem icon={Calendar} label="Valid from">
                    {rule.valid_from ? new Date(rule.valid_from).toLocaleDateString() : "-"}
                  </DetailItem>
                  <DetailItem icon={Calendar} label="Valid until">
                    {rule.valid_to ? new Date(rule.valid_to).toLocaleDateString() : "-"}
                  </DetailItem>
                </div>
              )}

              {rule.active_days && rule.active_days.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <CalendarClock className="size-3.5 text-brand" />
                    <p className="text-[11px] font-medium uppercase tracking-wider text-faint">Active days</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DAYS.map((day) => (
                      <span
                        key={day.value}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          rule.active_days!.includes(day.value)
                            ? "bg-brand/15 text-brand"
                            : "bg-surface-2 text-faint"
                        }`}
                      >
                        {day.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {rule.active_hours_start && rule.active_hours_end && (
                <DetailItem icon={Clock} label="Active hours">
                  {rule.active_hours_start.slice(0, 5)} – {rule.active_hours_end.slice(0, 5)}
                </DetailItem>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted">
              <CalendarClock className="size-3.5" />
              Always available — no restrictions
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-line px-5 py-4">
          <Button
            variant="outline"
            className="flex-1 border-danger/30 text-danger hover:bg-danger/10"
            onClick={() => onDelete(rule)}
          >
            <Trash2 className="mr-1.5 size-4" />
            Delete
          </Button>
          <Button className="flex-1" onClick={() => onEdit(rule)}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: DiscountRule | null;
}) {
  const isEdit = !!rule;
  const create = useCreateAdminDiscountRule();
  const update = useUpdateAdminDiscountRule();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<DiscountScope>("ORDER");
  const [type, setType] = useState<DiscountType>("PCT");
  const [value, setValue] = useState("");
  const [maxPct, setMaxPct] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>([]);
  const [hoursStart, setHoursStart] = useState("");
  const [hoursEnd, setHoursEnd] = useState("");

  const fromBp = (bp: number) => String(bp / 100);
  const toBp = (pct: string) => Math.round(parseFloat(pct) * 100);

  const toggleDay = (day: DayOfWeek) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const resetForm = (r?: DiscountRule | null) => {
    if (r) {
      setCode(r.code);
      setName(r.name);
      setScope(r.scope ?? "ORDER");
      setType(r.type);
      setValue(fromBp(r.value_bp));
      setMaxPct(r.max_pct_bp != null ? fromBp(r.max_pct_bp) : "");
      setIsActive(r.is_active !== false);
      setValidFrom(toDateInputValue(r.valid_from));
      setValidTo(toDateInputValue(r.valid_to));
      setActiveDays(r.active_days ?? []);
      setHoursStart(toTimeInputValue(r.active_hours_start));
      setHoursEnd(toTimeInputValue(r.active_hours_end));
    } else {
      setCode("");
      setName("");
      setScope("ORDER");
      setType("PCT");
      setValue("");
      setMaxPct("");
      setIsActive(true);
      setValidFrom("");
      setValidTo("");
      setActiveDays([]);
      setHoursStart("");
      setHoursEnd("");
    }
  };

  useEffect(() => {
    if (open) resetForm(rule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const valid = code.trim() && name.trim() && /^\d+(\.\d{1,2})?$/.test(value);

  const handleSubmit = () => {
    const payload = {
      code: code.trim(),
      name: name.trim(),
      scope,
      type,
      value_bp: toBp(value),
      max_pct_bp: maxPct ? toBp(maxPct) : null,
      valid_from: validFrom ? `${validFrom}T00:00:00Z` : null,
      valid_to: validTo ? `${validTo}T23:59:59Z` : null,
      active_days: activeDays.length > 0 ? activeDays : null,
      active_hours_start: hoursStart ? `${hoursStart}:00` : null,
      active_hours_end: hoursEnd ? `${hoursEnd}:00` : null,
    };

    if (isEdit && rule) {
      update.mutate(
        { id: rule.id, input: { ...payload, is_active: isActive } },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit discount rule" : "New discount rule"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this rule's settings." : "Tills apply this by code."}
          </DialogDescription>
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
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as DiscountScope)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORDER">Whole order</SelectItem>
                <SelectItem value="LINE">Line item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DiscountType)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PCT">Percentage</SelectItem>
                <SelectItem value="AMT">Fixed amount</SelectItem>
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

          {/* ---- Schedule section ---- */}
          <div className="border-t border-line pt-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="size-4 text-muted" />
              <Label className="text-sm font-medium">Schedule (optional)</Label>
            </div>
            <p className="mb-4 text-xs text-faint">
              Restrict when this discount can be used. Leave empty for no restrictions.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="d-valid-from">Valid from</Label>
                  <Input
                    id="d-valid-from"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-valid-to">Valid until</Label>
                  <Input
                    id="d-valid-to"
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Active days</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeDays.includes(day.value)
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-line text-muted hover:border-content/30"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-faint">
                  No selection means all days.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="d-hours-start">Active from</Label>
                  <Input
                    id="d-hours-start"
                    type="time"
                    value={hoursStart}
                    onChange={(e) => setHoursStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-hours-end">Active until</Label>
                  <Input
                    id="d-hours-end"
                    type="time"
                    value={hoursEnd}
                    onChange={(e) => setHoursEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                id="d-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-line accent-brand"
              />
              <Label htmlFor="d-active">Active</Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || create.isPending || update.isPending}
            onClick={handleSubmit}
          >
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
