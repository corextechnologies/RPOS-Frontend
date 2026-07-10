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
import { initials } from "@/lib/utils";
import type { User } from "@/lib/types";
import { ApiError } from "@/lib/types";

interface FormState {
  name: string;
  email: string;
  password: string;
  role_id: string;
  branch_id: string;
  is_active: boolean;
}

const empty: FormState = { name: "", email: "", password: "", role_id: "", branch_id: "", is_active: true };

export default function UsersPage() {
  const { can, user: me } = useAuth();
  const toast = useToast();
  const canWrite = can("users:write");

  const users = useAsync(() => api.listUsers());
  const roles = useAsync(() => api.listRoles());
  const branches = useAsync(() => api.listBranches());

  const roleName = (id: number) => roles.data?.find((r) => r.id === id)?.name ?? "—";
  const branchName = (id: string | null) =>
    id ? branches.data?.find((b) => b.id === id)?.name ?? "—" : "Central";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, role_id: roles.data?.[0] ? String(roles.data[0].id) : "" });
    setError(null);
    setOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role_id: String(u.role_id),
      branch_id: u.branch_id ?? "",
      is_active: u.is_active,
    });
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const patch: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role_id: Number(form.role_id),
          branch_id: form.branch_id || null,
          is_active: form.is_active,
        };
        if (form.password) patch.password = form.password;
        await api.updateUser(editing.id, patch);
        toast.success("User updated", form.name);
      } else {
        await api.createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role_id: Number(form.role_id),
          branch_id: form.branch_id || null,
          is_active: form.is_active,
        });
        toast.success("User created", form.email);
      }
      setOpen(false);
      users.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const invalid =
    !form.name ||
    !form.email ||
    !form.role_id ||
    (!editing && form.password.length < 8);

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/12 text-xs font-semibold text-brand">
            {initials(u.name)}
          </span>
          <div>
            <p className="flex items-center gap-2 font-medium text-content">
              {u.name}
              {me?.id === u.id && <Badge tone="brand">You</Badge>}
            </p>
            <p className="text-xs text-faint">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (u) => <Badge tone="outline"><Icon name="shield" size={12} /> {roleName(u.role_id)}</Badge> },
    { key: "branch", header: "Branch", render: (u) => <span className="text-muted">{branchName(u.branch_id)}</span> },
    { key: "status", header: "Status", render: (u) => <Badge tone={u.is_active ? "positive" : "neutral"} dot>{u.is_active ? "Active" : "Suspended"}</Badge> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) =>
        canWrite ? (
          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
            <Icon name="edit" size={15} /> Edit
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Access Control"
        title="Users"
        description="Platform accounts, each bound to a role and (optionally) a branch."
        actions={
          canWrite && (
            <Button onClick={openCreate} disabled={roles.loading}>
              <Icon name="plus" size={16} /> New user
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        rows={users.data ?? []}
        rowKey={(u) => u.id}
        loading={users.loading}
        empty={{ icon: "users", title: "No users", description: "Invite your first team member." }}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit user" : "New user"}
        description={editing ? editing.email : "Create a platform account."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={invalid}>
              {editing ? "Save changes" : "Create user"}
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
            <Field label="Full name" required>
              {(id) => <Input id={id} value={form.name} placeholder="Jane Cooper" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}
            </Field>
            <Field label="Email" required>
              {(id) => <Input id={id} type="email" value={form.email} placeholder="jane@restaurant.com" onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />}
            </Field>
          </div>

          <Field
            label={editing ? "New password" : "Password"}
            required={!editing}
            hint={editing ? "Leave blank to keep the current password." : "At least 8 characters."}
          >
            {(id) => (
              <Input
                id={id}
                type="password"
                value={form.password}
                placeholder="••••••••"
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" required>
              {(id) => (
                <Select
                  id={id}
                  value={form.role_id}
                  onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                  options={(roles.data ?? []).map((r) => ({ value: String(r.id), label: r.name }))}
                  placeholder="Select role"
                />
              )}
            </Field>
            <Field label="Branch" hint="Leave empty for central / org-wide users.">
              {(id) => (
                <Select
                  id={id}
                  value={form.branch_id}
                  onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                  options={(branches.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
                  placeholder="No branch (central)"
                />
              )}
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-content">Active</p>
              <p className="text-xs text-faint">Suspended users cannot sign in.</p>
            </div>
            <Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
