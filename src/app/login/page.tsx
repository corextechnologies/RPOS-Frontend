"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon, Logomark } from "@/components/icons";
import { USE_MOCK } from "@/lib/api";
import { ApiError } from "@/lib/types";

const DEMO = [
  { label: "Super Admin", email: "admin@test.com" },
  { label: "Head Office", email: "headoffice@test.com" },
  { label: "Auditor", email: "auditor@test.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("Test@1234");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back", "Signed in to the Main Admin portal.");
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-bg">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      {/* ---------- Brand panel ---------- */}
      <div className="relative hidden w-[46%] overflow-hidden lg:block">
        <div className="grain absolute inset-0 bg-cyprus-600" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 10%, rgba(61,187,154,0.28), transparent 55%), radial-gradient(90% 80% at 90% 100%, rgba(240,237,228,0.14), transparent 50%)",
          }}
        />
        {/* orbit rings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full border border-sand/20"
        />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[360px] w-[360px] rounded-full border border-sand/10" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-sand">
          <div className="flex items-center gap-3">
            <Logomark size={34} className="text-sand" />
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold tracking-tight">ROS</p>
              <p className="text-xs text-sand/60">Restaurant Operating System</p>
            </div>
          </div>

          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="font-display text-[42px] font-semibold leading-[1.05] tracking-tight"
            >
              One kitchen,
              <br />
              infinite branches,
              <br />
              <span className="text-accent">zero blind spots.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-5 max-w-sm text-sm leading-relaxed text-sand/70"
            >
              The Main Admin control plane for procurement, production, inventory,
              finance and every branch — unified in one platform.
            </motion.p>
          </div>

          <div className="flex items-center gap-6 text-xs text-sand/60">
            {["Master Data", "Branches", "RBAC", "Approvals"].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Form panel ---------- */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Logomark size={34} className="text-brand" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Main Admin Portal
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-content">
            Sign in to continue
          </h2>
          <p className="mt-2 text-sm text-muted">
            Enter your credentials to access the control plane.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field label="Email address" required>
              {(id) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
                    <Icon name="mail" size={17} />
                  </span>
                  <Input
                    id={id}
                    type="email"
                    autoComplete="email"
                    className="pl-10"
                    placeholder="you@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
            </Field>

            <Field label="Password" required>
              {(id) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
                    <Icon name="lock" size={17} />
                  </span>
                  <Input
                    id={id}
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className="pl-10 pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition hover:text-content"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPw ? "eyeOff" : "eye"} size={17} />
                  </button>
                </div>
              )}
            </Field>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
              >
                <Icon name="alert" size={16} />
                {error}
              </motion.div>
            )}

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {!submitting && <Icon name="arrowRight" size={17} />}
              Sign in
            </Button>
          </form>

          {USE_MOCK && (
            <div className="mt-8 rounded-2xl border border-line bg-surface-2/60 p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Icon name="sparkle" size={13} className="text-brand" />
                Demo mode · password{" "}
                <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-content">
                  Test@1234
                </code>
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword("Test@1234");
                    }}
                    className="focus-ring rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-brand/40 hover:text-brand"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
