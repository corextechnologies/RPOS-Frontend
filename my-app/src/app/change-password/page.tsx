"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AUTH_ROUTES, postAuthPath, requiresPasswordChange } from "@/lib/auth/actions";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/lib/hooks/use-auth-mutations";
import { upgradeBranchStaffToPos } from "@/lib/pos/upgrade";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const mutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(AUTH_ROUTES.login);
      return;
    }
    if (!requiresPasswordChange(user)) {
      router.replace(postAuthPath(user));
    }
  }, [user, loading, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) return;
    await mutation.mutateAsync({
      current_password: currentPassword,
      new_password: newPassword,
    });
    const me = await api.me();
    if (me.role === "BRANCH_STAFF" && !requiresPasswordChange(me)) {
      await upgradeBranchStaffToPos(me.email, newPassword);
    }
    await refresh();
    router.replace(postAuthPath(me));
  };

  if (loading || !user) {
    return null;
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Your account requires a password change before you can access your portal."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">Current / temporary password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="current"
              type="password"
              className="pl-10"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new">New password</Label>
          <Input
            id="new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {confirm && newPassword !== confirm && (
            <p className="text-xs text-danger">Passwords do not match.</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending || newPassword !== confirm}>
          {mutation.isPending ? "Saving…" : "Save and continue"}
        </Button>
      </form>
    </AuthLayout>
  );
}
