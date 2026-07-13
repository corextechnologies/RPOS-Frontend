"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/Misc";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/icons";
import { MASTER_DATA, ResourceDef, FieldDef } from "@/lib/master-data-config";
import { formatDate, titleCase } from "@/lib/utils";
import { ApiError } from "@/lib/types";

type Row = { id: number; [k: string]: unknown };

export default function MasterDataPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canWrite = can("master_data:write");
  const { confirm, dialog } = useConfirm();

  const [activeKey, setActiveKey] = useState(MASTER_DATA[0].key);
  const resource = useMemo(
    () => MASTER_DATA.find((r) => r.key === activeKey)!,
    [activeKey],
  );

  const branches = useAsync(() => api.listBranches());
  const list = useAsync<Row[]>(
    () => api.listMasterData(activeKey) as unknown as Promise<Row[]>,
    [activeKey],
  );

  const branchName = (id: unknown) =>
    id ? branches.data?.find((b) => b.id === id)?.name ?? "—" : "—";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(Object.fromEntries(resource.fields.map((f) => [f.name, ""])));
    setError(null);
    setOpen(true);
  };
  const openEdit = (row: Row) => {
    setEditing(row);
    setForm(
      Object.fromEntries(
        resource.fields.map((f) => [f.name, row[f.name] != null ? String(row[f.name]) : ""]),
      ),
    );
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {};
    for (const f of resource.fields) {
      const raw = form[f.name];
      if (f.type === "number") body[f.name] = raw === "" ? null : Number(raw);
      else body[f.name] = raw === "" ? null : raw;
    }
    try {
      if (editing) {
        await api.updateMasterData(activeKey, editing.id, body);
        toast.success(`${resource.singular} updated`);
      } else {
        await api.createMasterData(activeKey, body);
        toast.success(`${resource.singular} created`);
      }
      setOpen(false);
      list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    const ok = await confirm({
      title: `Delete ${resource.singular.toLowerCase()}?`,
      description: `"${String(row[resource.primary])}" will be permanently removed.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteMasterData(activeKey, row.id);
      toast.success(`${resource.singular} deleted`);
      list.reload();
    } catch (err) {
      toast.error("Failed to delete", err instanceof ApiError ? err.message : undefined);
    }
  };

  const renderCell = (row: Row, f: FieldDef) => {
    const val = row[f.name];
    if (f.type === "branch") return <span className="text-muted">{branchName(val)}</span>;
    if (f.type === "select") {
      const label = f.options?.find((o) => o.value === val)?.label ?? titleCase(String(val ?? ""));
      return val ? <Badge tone="outline">{label}</Badge> : <span className="text-faint">—</span>;
    }
    if (val == null || val === "") return <span className="text-faint">—</span>;
    return <span className="text-muted">{String(val)}</span>;
  };

  const columns: Column<Row>[] = [
    {
      key: resource.primary,
      header: titleCase(resource.primary),
      render: (row) => (
        <span className={resource.primary === "key" ? "font-mono text-sm text-content" : "font-medium text-content"}>
          {String(row[resource.primary] ?? "—")}
        </span>
      ),
    },
    ...resource.fields
      .filter((f) => f.column)
      .map((f) => ({
        key: f.name,
        header: f.label,
        render: (row: Row) => renderCell(row, f),
      })),
    {
      key: "effective_date",
      header: "Effective",
      render: (row) => <span className="text-muted">{formatDate(row.effective_date as string)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) =>
        canWrite ? (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit">
              <Icon name="edit" size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remove(row)} aria-label="Delete">
              <Icon name="trash" size={16} className="text-danger" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Master Data"
        description="One governed place to define shared reference values, referenced everywhere they're used."
        actions={
          canWrite && (
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> New {resource.singular.toLowerCase()}
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {MASTER_DATA.map((r) => {
          const active = r.key === activeKey;
          return (
            <button
              key={r.key}
              onClick={() => setActiveKey(r.key)}
              className={`focus-ring relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active ? "text-brand" : "text-muted hover:bg-surface-2 hover:text-content"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="md-tab"
                  className="absolute inset-0 rounded-xl border border-brand/20 bg-brand/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon name={r.icon} size={16} />
                {r.label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-4 text-sm text-muted">{resource.description}</p>
          <DataTable
            columns={columns}
            rows={list.data ?? []}
            rowKey={(r) => r.id}
            loading={list.loading}
            empty={{
              icon: resource.icon,
              title: `No ${resource.label.toLowerCase()}`,
              description: canWrite ? `Add your first ${resource.singular.toLowerCase()}.` : undefined,
              action: canWrite ? (
                <Button onClick={openCreate}><Icon name="plus" size={16} /> New {resource.singular.toLowerCase()}</Button>
              ) : undefined,
            }}
          />
        </motion.div>
      </AnimatePresence>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${resource.singular.toLowerCase()}` : `New ${resource.singular.toLowerCase()}`}
        description={resource.label}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={resource.fields.some((f) => f.required && !form[f.name])}>
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
          {resource.fields.map((f) => (
            <Field key={f.name} label={f.label} required={f.required} hint={f.hint}>
              {(id) => {
                if (f.type === "textarea")
                  return <Textarea id={id} value={form[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))} />;
                if (f.type === "select")
                  return (
                    <Select
                      id={id}
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      options={f.options ?? []}
                      placeholder="Select…"
                    />
                  );
                if (f.type === "branch")
                  return (
                    <Select
                      id={id}
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
                      placeholder="None (platform-wide)"
                    />
                  );
                return (
                  <Input
                    id={id}
                    type={f.type === "number" ? "number" : "text"}
                    step={f.step}
                    value={form[f.name] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  />
                );
              }}
            </Field>
          ))}
        </div>
      </Modal>
      {dialog}
    </div>
  );
}
