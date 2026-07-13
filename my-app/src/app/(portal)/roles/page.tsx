"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { PageHeader, Skeleton } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons";
import { titleCase } from "@/lib/utils";
import { PERMISSION_CATALOG } from "@/lib/types";
import type { Role } from "@/lib/types";
import { ApiError } from "@/lib/types";

const ACTION_TONE: Record<string, "positive" | "brand" | "warning" | "neutral"> = {
  read: "neutral",
  write: "brand",
  approve: "warning",
  assign: "warning",
};

// group "module:action" by module
function groupCatalog() {
  const groups: Record<string, string[]> = {};
  for (const code of PERMISSION_CATALOG) {
    const [mod] = code.split(":");
    (groups[mod] ??= []).push(code);
  }
  return groups;
}

export default function RolesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const canWriteRole = can("roles:write");
  const canAssign = can("permissions:assign");

  const roles = useAsync(() => api.listRoles());
  const groups = useMemo(groupCatalog, []);

  // permission editor
  const [editing, setEditing] = useState<Role | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  // new role
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEditor = (r: Role) => {
    setEditing(r);
    setSelected(new Set(r.permissions));
  };

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const toggleModule = (codes: string[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = codes.every((c) => next.has(c));
      codes.forEach((c) => (allOn ? next.delete(c) : next.add(c)));
      return next;
    });

  const savePerms = async () => {
    if (!editing) return;
    setSavingPerms(true);
    try {
      await api.assignPermissions(editing.id, Array.from(selected));
      toast.success("Permissions updated", editing.name);
      setEditing(null);
      roles.reload();
    } catch (err) {
      toast.error("Failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSavingPerms(false);
    }
  };

  const createRole = async () => {
    setCreating(true);
    setError(null);
    try {
      await api.createRole(newName.trim());
      toast.success("Role created", newName);
      setNewOpen(false);
      setNewName("");
      roles.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create role");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Access Control"
        title="Roles & Permissions"
        description="Permissions are modeled as (role, module, action) — configure access without touching code."
        actions={
          canWriteRole && (
            <Button onClick={() => { setNewName(""); setError(null); setNewOpen(true); }}>
              <Icon name="plus" size={16} /> New role
            </Button>
          )
        }
      />

      {roles.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.data?.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="card group flex flex-col p-5"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Icon name="shield" size={20} />
                </span>
                <Badge tone="neutral">{r.permissions.length} permissions</Badge>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-content">
                {r.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.keys(groups)
                  .filter((mod) => groups[mod].some((c) => r.permissions.includes(c)))
                  .slice(0, 6)
                  .map((mod) => (
                    <span key={mod} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                      {titleCase(mod)}
                    </span>
                  ))}
              </div>
              <div className="mt-auto pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openEditor(r)}
                  disabled={!canAssign}
                >
                  <Icon name="key" size={15} />
                  {canAssign ? "Manage permissions" : "View permissions"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Permission matrix editor */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.name} · permissions` : ""}
        description="Toggle module actions. Changes replace the role's full permission set."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={savePerms} loading={savingPerms} disabled={!canAssign}>
              Save permissions
            </Button>
          </>
        }
      >
        <div className="space-y-2.5">
          {Object.entries(groups).map(([mod, codes]) => {
            const allOn = codes.every((c) => selected.has(c));
            const someOn = codes.some((c) => selected.has(c));
            return (
              <div key={mod} className="rounded-xl border border-line bg-surface-2/50 p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-content">
                    <Icon name="grid" size={15} className="text-brand" />
                    {titleCase(mod)}
                  </p>
                  <button
                    type="button"
                    disabled={!canAssign}
                    onClick={() => toggleModule(codes)}
                    className="text-xs font-medium text-brand transition hover:underline disabled:opacity-50"
                  >
                    {allOn ? "Clear all" : someOn ? "Select all" : "Select all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {codes.map((code) => {
                    const action = code.split(":")[1];
                    const on = selected.has(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        disabled={!canAssign}
                        onClick={() => toggle(code)}
                        className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                          on
                            ? "border-brand/40 bg-brand/12 text-brand"
                            : "border-line bg-surface text-muted hover:border-brand/30"
                        }`}
                      >
                        <span className={`grid h-3.5 w-3.5 place-items-center rounded-[4px] border ${on ? "border-brand bg-brand text-brand-contrast" : "border-line"}`}>
                          {on && <Icon name="check" size={10} />}
                        </span>
                        {titleCase(action)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-xs text-faint">
            {selected.size} of {PERMISSION_CATALOG.length} permissions selected
          </p>
        </div>
      </Modal>

      {/* New role */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New role"
        description="Roles start with no permissions — assign them after creating."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={createRole} loading={creating} disabled={!newName.trim()}>Create role</Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              <Icon name="alert" size={16} /> {error}
            </div>
          )}
          <Field label="Role name" required>
            {(id) => <Input id={id} value={newName} placeholder="Franchise Owner" onChange={(e) => setNewName(e.target.value)} />}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
