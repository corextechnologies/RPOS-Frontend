"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logomark } from "@/components/icons";
import { USE_MOCK } from "@/lib/api";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

const DEMO = [{ label: "Super Admin", email: "superadmin@ros.test", password: "Super@1234" }];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState("superadmin@ros.test");
  const [password, setPassword] = useState("Super@1234");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "super_admin" ? "/super-admin/dashboard" : "/login");
    }
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const path = await login(email.trim(), password);
      toast.success("Welcome back");
      router.replace(path);
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

      <div className="relative hidden w-[46%] overflow-hidden lg:block">
        <div className="grain absolute inset-0 bg-cyprus-600" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(120% 90% at 15% 10%, rgba(61,187,154,0.28), transparent 55%), radial-gradient(90% 80% at 90% 100%, rgba(240,237,228,0.14), transparent 50%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full border border-sand/20"
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-sand">
          <div className="flex items-center gap-3">
            <Logomark size={34} className="text-sand" />
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold tracking-tight">Restaurant OS</p>
              <p className="text-xs text-sand/60">Multi-tenant operating system</p>
            </div>
          </div>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="font-display text-[42px] font-semibold leading-[1.05] tracking-tight"
            >
              Manage every restaurant,
              <br />
              from one control plane.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-5 max-w-sm text-sm leading-relaxed text-sand/70"
            >
              Super Admin portal for tenant onboarding, plan management, billing, and access control.
            </motion.p>
          </div>
          <div className="flex items-center gap-6 text-xs text-sand/60">
            {["Tenants", "Plans", "Billing", "Access"].map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

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

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Super Admin Portal</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-content">Sign in to continue</h2>
          <p className="mt-2 text-sm text-muted">Enter your credentials to access the Super Admin portal.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="pl-10"
                  placeholder="superadmin@ros.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input
                  id="password"
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
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {!submitting && <ArrowRight className="h-4 w-4" />}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {USE_MOCK && (
            <div className="mt-8 rounded-2xl border border-line bg-surface-2/60 p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
                Demo mode
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(d.password);
                    }}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-brand/40 hover:text-brand"
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
