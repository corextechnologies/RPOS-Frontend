"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, MonitorSmartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES, postAuthPath } from "@/lib/auth/actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiConfig, USE_MOCK } from "@/lib/api";
import { ApiError } from "@/lib/types/super-admin";
import { notify } from "@/lib/toast";
import { isApiCode, needsRepairing, POS_ERROR } from "@/lib/api/errors";
import { posSession, POS_ROUTES } from "@/lib/pos/session";

const MOCK_ACCOUNTS = [
  { label: "Super Admin", email: apiConfig.mockDemoEmail, password: apiConfig.mockDemoPassword },
  { label: "Admin", email: "admin@demo-restaurant.ros", password: "Demo@1234" },
  { label: "Warehouse", email: "warehouse@demo.ros", password: "Demo@1234" },
  { label: "Kitchen", email: "kitchen@demo.ros", password: "Demo@1234" },
  { label: "Branch", email: "branch@demo.ros", password: "Demo@1234" },
  { label: "Temp password", email: "temp@demo.ros", password: "Temp@1234" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();

  const [email, setEmail] = useState(USE_MOCK ? "admin@demo-restaurant.ros" : "");
  const [password, setPassword] = useState(USE_MOCK ? "Demo@1234" : "");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDemo = USE_MOCK;

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "BRANCH_STAFF" && !posSession.token) return;
      router.replace(postAuthPath(user));
    }
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const path = await login(email.trim(), password);
      notify("success", "Welcome back");
      router.replace(path);
    } catch (err) {
      // A revoked or never-paired till recovers by re-pairing, not by retrying
      // the password — send it straight to the activation screen.
      if (needsRepairing(err)) {
        posSession.unpair();
        router.replace(POS_ROUTES.activate);
        return;
      }
      if (isApiCode(err, POS_ERROR.DEVICE_BRANCH_MISMATCH)) {
        setError("Your account belongs to another branch.");
      } else if (err instanceof ApiError && err.code === "restaurant_halted") {
        setError("This restaurant's plan is currently halted.");
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to continue"
      subtitle="One login for portals and POS tills."
      footer={
        <Link href={AUTH_ROUTES.forgotPassword} className="font-medium text-brand hover:underline">
          Forgot your password?
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="pl-10"
              placeholder="you@company.com"
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

        <Link
          href={POS_ROUTES.activate}
          className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted transition hover:text-brand"
        >
          <MonitorSmartphone className="size-3.5" aria-hidden />
          Setting up a new till? Pair this terminal
        </Link>
      </form>

      {showDemo && (
        <div className="mt-8 rounded-2xl border border-line bg-surface-2/60 p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Demo accounts
          </p>
          <div className="flex flex-wrap gap-2">
            {MOCK_ACCOUNTS.filter((a) => a.email && a.password).map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-brand/40 hover:text-brand"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
