"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { AuthBackLink, AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/lib/hooks/use-auth-mutations";
import { AUTH_ROUTES } from "@/lib/auth/actions";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutation = useResetPassword();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    await mutation.mutateAsync({ token: token.trim(), password });
    router.replace(AUTH_ROUTES.login);
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter the reset token from your email and set a new password."
      footer={<AuthBackLink href={AUTH_ROUTES.login} label="Back to sign in" />}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">Reset token</Label>
          <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="password"
              type="password"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {confirm && password !== confirm && (
            <p className="text-xs text-danger">Passwords do not match.</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending || password !== confirm}>
          {mutation.isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
