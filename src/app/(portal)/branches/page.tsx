"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/Misc";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons";
import { titleCase } from "@/lib/utils";
import type { Branch, BranchTiming, BranchType, Organization } from "@/lib/types";
import { ApiError } from "@/lib/types";

const BRANCH_TYPES: { value: BranchType; label: string }[] = [
  { value: "hub", label: "Production Hub" },
  { value: "branch", label: "Retail Branch" },
  { value: "franchise", label: "Franchise" },
  { value: "dark_kitchen", label: "Dark Kitchen" },
];

const TYPE_TONE: Record<BranchType, "brand" | "neutral" | "warning" | "positive"> = {
  hub: "brand",
  branch: "neutral",
  franchise: "warning",
  dark_kitchen: "positive",
};

interface FormState {
  organization_id: string;
  name: string;
  location: string;
  branch_type: BranchType;
  tax_percentage: string;
  tax_percentage_online: string;
  delivery_type: string;
  is_active: boolean;
  timings: BranchTiming[];
}

const emptyForm = (orgId: string): FormState => ({
  organization_id: orgId,
  name: "",
  location: "",
  branch_type: "branch",
  tax_percentage: "",
  tax_percentage_online: "",
  delivery_type: "",
  is_active: true,
  timings: [{ day: "Mon-Fri", open: "09:00", close: "23:00" }],
});

export default function BranchesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can("branches:write");

  const orgs = useAsync(() => api.listOrganizations());
  const branches = useAsync(() => api.listBranches());

  const orgName = (id: string) => orgs.data?.find((o) => o.id === id)?.name ?? "—";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    const orgId = orgs.data?.[0]?.id ?? "";
    setEditing(null);
    setForm(emptyForm(orgId));
    setError(null);
    setOpen(true);
  };
  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      organization_id: b.organization_id,
      name: b.name,
      location: b.location,
      branch_type: b.branch_type,
      tax_percentage: b.tax_percentage != null ? String(b.tax_percentage) : "",
      tax_percentage_online: b.tax_percentage_online != null ? String(b.tax_percentage_online) : "",
      delivery_type: b.delivery_type ?? "",
      is_active: b.is_active,
      timings: b.timings?.length ? b.timings : [{ day: "Mon-Fri", open: "09:00", close: "23:00" }],
    });
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      organization_id: form.organization_id,
      name: form.name,
      location: form.location,
      branch_type: form.branch_type,
      delivery_type: form.delivery_type || null,
      tax_percentage: form.tax_percentage === "" ? null : Number(form.tax_percentage),
      tax_percentage_online:
        form.tax_percentage_online === "" ? null : Number(form.tax_percentage_online),
      is_active: form.is_active,
      timings: form.timings.filter((t) => t.day),
    };
    try {
      if (editing) {
        const { organization_id, ...patch } = payload;
        await api.updateBranch(editing.id, patch);
        toast.success("Branch updated", form.name);
      } else {
        await api.createBranch(payload);
        toast.success("Branch created", form.name);
      }
      setOpen(false);
      branches.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const setTiming = (i: number, key: keyof BranchTiming, value: string) =>
    setForm((f) => ({
      ...f,
      timings: f.timings.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)),
    }));

  const columns: Column<Branch>[] = [
    {
      key: "name",
      header: "Branch",
      render: (b) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
            <Icon name={b.branch_type === "hub" ? "box" : "branch"} size={17} />
          </span>
          <div>
            <p className="font-medium text-content">{b.name}</p>
            <p className="flex items-center gap-1 text-xs text-faint">
              <Icon name="pin" size={12} /> {b.location}
            </p>
          </div>
        </div>
      ),
    },
    { key: "org", header: "Organization", render: (b) => <span className="text-muted">{orgName(b.organization_id)}</span> },
    { key: "type", header: "Type", render: (b) => <Badge tone={TYPE_TONE[b.branch_type]}>{titleCase(b.branch_type)}</Badge> },
    {
      key: "tax",
      header: "Tax",
      render: (b) =>
        b.tax_percentage != null ? (
          <span className="text-muted">{b.tax_percentage}%{b.tax_percentage_online != null ? ` · ${b.tax_percentage_online}% online` : ""}</span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    { key: "status", header: "Status", render: (b) => <Badge tone={b.is_active ? "positive" : "neutral"} dot>{b.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (b) =>
        canWrite ? (
          <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
            <Icon name="edit" size={15} /> Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title="Branches"
        description="Production hubs, retail branches, franchises and dark kitchens — each a geocoded, first-class entity."
        actions={
          canWrite && (
            <Button onClick={openCreate} disabled={orgs.loading || (orgs.data?.length ?? 0) === 0}>
              <Icon name="plus" size={16} /> New branch
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        rows={branches.data ?? []}
        rowKey={(b) => b.id}
        loading={branches.loading}
        empty={{ icon: "branch", title: "No branches", description: "Add your first branch to the network." }}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit branch" : "New branch"}
        description={editing ? editing.name : "Add a branch to the network."}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={!form.name || !form.location || !form.organization_id}>
              {editing ? "Save changes" : "Create branch"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Branch name" required>
              {(id) => <Input id={id} value={form.name} placeholder="Downtown Branch" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}
            </Field>
            <Field label="Location" required>
              {(id) => <Input id={id} value={form.location} placeholder="Main St" onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization" required>
              {(id) => (
                <Select
                  id={id}
                  value={form.organization_id}
                  disabled={!!editing}
                  onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}
                  options={(orgs.data ?? []).map((o: Organization) => ({ value: o.id, label: o.name }))}
                  placeholder="Select organization"
                />
              )}
            </Field>
            <Field label="Branch type">
              {(id) => (
                <Select
                  id={id}
                  value={form.branch_type}
                  onChange={(e) => setForm((f) => ({ ...f, branch_type: e.target.value as BranchType }))}
                  options={BRANCH_TYPES}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tax %" hint="In-store">
              {(id) => <Input id={id} type="number" step="0.01" value={form.tax_percentage} placeholder="16" onChange={(e) => setForm((f) => ({ ...f, tax_percentage: e.target.value }))} />}
            </Field>
            <Field label="Tax % online">
              {(id) => <Input id={id} type="number" step="0.01" value={form.tax_percentage_online} placeholder="17" onChange={(e) => setForm((f) => ({ ...f, tax_percentage_online: e.target.value }))} />}
            </Field>
            <Field label="Delivery type">
              {(id) => (
                <Select
                  id={id}
                  value={form.delivery_type}
                  onChange={(e) => setForm((f) => ({ ...f, delivery_type: e.target.value }))}
                  options={[
                    { value: "hybrid", label: "Hybrid" },
                    { value: "delivery_only", label: "Delivery only" },
                    { value: "pickup_only", label: "Pickup only" },
                  ]}
                  placeholder="—"
                />
              )}
            </Field>
          </div>

          {/* Timings editor */}
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium text-content">
                <Icon name="clock" size={15} className="text-brand" /> Operating hours
              </p>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, timings: [...f.timings, { day: "", open: "09:00", close: "22:00" }] }))}
                className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <Icon name="plus" size={13} /> Add row
              </button>
            </div>
            <div className="space-y-2">
              {form.timings.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={t.day} placeholder="Mon-Fri" className="flex-1" onChange={(e) => setTiming(i, "day", e.target.value)} />
                  <Input type="time" value={t.open} className="w-28" onChange={(e) => setTiming(i, "open", e.target.value)} />
                  <span className="text-faint">–</span>
                  <Input type="time" value={t.close} className="w-28" onChange={(e) => setTiming(i, "close", e.target.value)} />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, timings: f.timings.filter((_, idx) => idx !== i) }))}
                    className="shrink-0 rounded-lg p-2 text-faint transition hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-content">Active</p>
              <p className="text-xs text-faint">Inactive branches don&apos;t receive transfers or orders.</p>
            </div>
            <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
