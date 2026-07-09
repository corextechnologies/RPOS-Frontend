"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { PageHeader, Card } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons";
import { USE_MOCK } from "@/lib/api";
import { initials, titleCase } from "@/lib/utils";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const router = useRouter();

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const resetDemo = () => {
    localStorage.removeItem("rpos-mock-db");
    toast.success("Demo data reset", "Reloading with fresh seed data…");
    setTimeout(() => window.location.reload(), 700);
  };

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, appearance and platform connection."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Profile */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight text-content">Profile</h2>
          <div className="mt-5 flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-strong text-xl font-semibold text-brand-contrast">
              {user ? initials(user.name) : "··"}
            </span>
            <div>
              <p className="text-lg font-semibold text-content">{user?.name}</p>
              <p className="text-sm text-muted">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="brand"><Icon name="shield" size={12} /> {user?.role}</Badge>
                <Badge tone={user?.is_active ? "positive" : "neutral"} dot>
                  {user?.is_active ? "Active" : "Suspended"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 hairline h-px" />

          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-muted">
              Your permissions ({user?.permissions.length ?? 0})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {user?.permissions.map((p) => {
                const [mod, action] = p.split(":");
                return (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-muted"
                  >
                    <span className="text-content">{titleCase(mod)}</span>
                    <span className="text-faint">·</span>
                    <span className="text-brand">{action}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {/* Appearance */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight text-content">Appearance</h2>
            <p className="mt-1 text-sm text-muted">Choose how the portal looks.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`focus-ring rounded-2xl border-2 p-3 text-left transition ${
                    theme === t ? "border-brand" : "border-line hover:border-brand/40"
                  }`}
                >
                  <div
                    className={`mb-2.5 h-14 w-full rounded-lg border ${
                      t === "dark" ? "border-white/10 bg-[#080808]" : "border-black/5 bg-[#f0ede4]"
                    }`}
                  >
                    <div className="flex h-full items-center gap-1.5 px-2">
                      <span className={`h-6 w-6 rounded-md ${t === "dark" ? "bg-[#14a88c]" : "bg-[#004741]"}`} />
                      <div className="space-y-1">
                        <span className={`block h-1.5 w-10 rounded-full ${t === "dark" ? "bg-white/25" : "bg-black/15"}`} />
                        <span className={`block h-1.5 w-7 rounded-full ${t === "dark" ? "bg-white/15" : "bg-black/10"}`} />
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-content">
                    <Icon name={t === "dark" ? "moon" : "sun"} size={15} />
                    {titleCase(t)}
                    {theme === t && <Icon name="check" size={14} className="ml-auto text-brand" />}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Connection */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight text-content">Connection</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Data source</span>
                <Badge tone={USE_MOCK ? "warning" : "positive"} dot>
                  {USE_MOCK ? "Mock (demo)" : "Live backend"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">API base</span>
                <code className="truncate rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-content">
                  {apiBase}/v1
                </code>
              </div>
            </div>
            {USE_MOCK && (
              <>
                <p className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                  Running on a persistent in-browser mock. To connect the real API, set
                  <code className="mx-1 rounded bg-surface px-1 font-mono">NEXT_PUBLIC_USE_MOCK=false</code>
                  in <code className="font-mono">.env.local</code> and restart.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={resetDemo}>
                  <Icon name="pulse" size={15} /> Reset demo data
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>

      <Card className="mt-5 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-content">Sign out of this session</p>
          <p className="text-xs text-faint">You&apos;ll need your credentials to sign back in.</p>
        </div>
        <Button variant="danger" onClick={doLogout}>
          <Icon name="logout" size={16} /> Sign out
        </Button>
      </Card>
    </div>
  );
}
