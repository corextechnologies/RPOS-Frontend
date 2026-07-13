"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card, Skeleton } from "@/components/ui/Misc";
import { Badge } from "@/components/ui/Badge";
import { Icon, IconName } from "@/components/icons";
import { titleCase } from "@/lib/utils";

const MASTER_KEYS = [
  "units", "categories", "taxes", "storage-locations", "packaging-types",
  "allergens", "reason-codes", "temperature-ranges", "configuration-values",
] as const;

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
  loading,
  delay,
}: {
  icon: IconName;
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  loading?: boolean;
  delay: number;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card group relative overflow-hidden p-5 transition hover:shadow-lift"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <Icon name={icon} size={20} />
        </span>
        {href && (
          <span className="text-faint opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">
            <Icon name="arrowUpRight" size={16} />
          </span>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="font-display text-3xl font-semibold tracking-tight text-content">
            {value}
          </p>
        )}
        <p className="mt-1 text-sm font-medium text-muted">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
    </motion.div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const orgs = useAsync(() => api.listOrganizations());
  const branches = useAsync(() => api.listBranches());
  const users = useAsync(() => api.listUsers());
  const roles = useAsync(() => api.listRoles());
  const master = useAsync(async () => {
    const counts = await Promise.all(MASTER_KEYS.map((k) => api.listMasterData(k)));
    return counts.reduce((sum, list) => sum + list.length, 0);
  });

  const activeBranches = branches.data?.filter((b) => b.is_active).length ?? 0;
  const hubs = branches.data?.filter((b) => b.branch_type === "hub").length ?? 0;
  const activeUsers = users.data?.filter((u) => u.is_active).length ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        eyebrow="Operations Overview"
        title={`${greeting}, ${user?.name?.split(" ")[0] ?? "Admin"}`}
        description="Cross-functional oversight across master data, branches and access control."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon="org" label="Organizations" href="/organizations"
          value={orgs.data?.length ?? 0} loading={orgs.loading} delay={0.02}
          hint={`${orgs.data?.filter((o) => o.is_active).length ?? 0} active`}
        />
        <StatCard
          icon="branch" label="Branches" href="/branches"
          value={branches.data?.length ?? 0} loading={branches.loading} delay={0.06}
          hint={`${activeBranches} active · ${hubs} hub`}
        />
        <StatCard
          icon="users" label="Users" href="/users"
          value={users.data?.length ?? 0} loading={users.loading} delay={0.1}
          hint={`${activeUsers} active`}
        />
        <StatCard
          icon="layers" label="Master Data" href="/master-data"
          value={master.data ?? 0} loading={master.loading} delay={0.14}
          hint={`${MASTER_KEYS.length} catalogs`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Branch network */}
        <Card className="lg:col-span-2 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-content">
                Branch network
              </h2>
              <p className="text-sm text-muted">Production hubs and retail branches</p>
            </div>
            <Link
              href="/branches"
              className="flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              View all <Icon name="chevronRight" size={15} />
            </Link>
          </div>
          {branches.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {branches.data?.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-line hover:bg-surface-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                    <Icon name={b.branch_type === "hub" ? "box" : "branch"} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content">{b.name}</p>
                    <p className="truncate text-xs text-faint">{b.location}</p>
                  </div>
                  <Badge tone="outline">{titleCase(b.branch_type)}</Badge>
                  <Badge tone={b.is_active ? "positive" : "neutral"} dot>
                    {b.is_active ? "Active" : "Off"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Access control snapshot */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight text-content">
            Access control
          </h2>
          <p className="mt-1 text-sm text-muted">
            {roles.loading ? "…" : `${roles.data?.length ?? 0} roles configured`}
          </p>
          <div className="mt-4 space-y-2.5">
            {roles.loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
              : roles.data?.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-content">{r.name}</span>
                    <span className="text-xs text-faint">{r.permissions.length} perms</span>
                  </div>
                ))}
          </div>
          <Link
            href="/roles"
            className="mt-4 flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Manage roles <Icon name="chevronRight" size={15} />
          </Link>
        </Card>
      </div>

      {/* Phase 2 preview strip */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { icon: "check-circle" as IconName, title: "Approvals queue", note: "Approval Engine · Phase 2" },
          { icon: "pulse" as IconName, title: "Low-stock alerts", note: "Inventory module · Phase 2" },
          { icon: "receipt" as IconName, title: "Forecast vs actual", note: "Planning module · Phase 2" },
        ].map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="card flex items-center gap-3 border-dashed p-4 opacity-80"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-faint">
              <Icon name={c.icon} size={18} />
            </span>
            <div>
              <p className="text-sm font-medium text-content">{c.title}</p>
              <p className="text-xs text-faint">{c.note}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
