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
import { Field, Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import type { Organization } from "@/lib/types";
import { ApiError } from "@/lib/types";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function OrganizationsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.listOrganizations());
  const canWrite = can("organizations:write");

  const [editing, setEditing] = useState<Organization | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", is_active: true });
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", is_active: true });
    setSlugTouched(false);
    setError(null);
    setOpen(true);
  };
  const openEdit = (o: Organization) => {
    setEditing(o);
    setForm({ name: o.name, slug: o.slug, is_active: o.is_active });
    setSlugTouched(true);
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.updateOrganization(editing.id, form);
        toast.success("Organization updated", form.name);
      } else {
        await api.createOrganization(form);
        toast.success("Organization created", form.name);
      }
      setOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Organization>[] = [
    {
      key: "name",
      header: "Organization",
      render: (o) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 font-semibold text-brand">
            <Icon name="org" size={17} />
          </span>
          <div>
            <p className="font-medium text-content">{o.name}</p>
            <p className="font-mono text-xs text-faint">{o.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <Badge tone={o.is_active ? "positive" : "neutral"} dot>
          {o.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    { key: "created", header: "Created", render: (o) => <span className="text-muted">{formatDate(o.created_at)}</span> },
    { key: "updated", header: "Updated", render: (o) => <span className="text-muted">{formatDate(o.updated_at)}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (o) =>
        canWrite ? (
          <Button variant="ghost" size="sm" onClick={() => openEdit(o)}>
            <Icon name="edit" size={15} /> Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title="Organizations"
        description="Top-level tenants that own branches, users and master data."
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New organization
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(o) => o.id}
        loading={loading}
        empty={{
          icon: "org",
          title: "No organizations",
          description: "Create your first organization to get started.",
          action: canWrite ? <Button onClick={openCreate}><Icon name="plus" size={16} /> New organization</Button> : undefined,
        }}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit organization" : "New organization"}
        description={editing ? editing.name : "Add a new top-level tenant."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={!form.name || !form.slug}>
              {editing ? "Save changes" : "Create"}
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
          <Field label="Name" required>
            {(id) => (
              <Input
                id={id}
                value={form.name}
                placeholder="Demo Restaurant Group"
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: slugTouched ? f.slug : slugify(name),
                  }));
                }}
              />
            )}
          </Field>
          <Field label="Slug" required hint="URL-safe identifier, unique per platform.">
            {(id) => (
              <Input
                id={id}
                value={form.slug}
                placeholder="demo-restaurant-group"
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
              />
            )}
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-content">Active</p>
              <p className="text-xs text-faint">Inactive tenants are hidden from operations.</p>
            </div>
            <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
