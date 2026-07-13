"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthBackLink, AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/lib/hooks/use-auth-mutations";
import { AUTH_ROUTES } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const mutation = useForgotPassword();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync({ email: email.trim() });
    setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link if an account exists."
      footer={<AuthBackLink href={AUTH_ROUTES.login} label="Back to sign in" />}
    >
      {sent ? (
        <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
          <p>If an account exists for <span className="font-medium text-content">{email}</span>, check your inbox for reset instructions.</p>
          <p>In mock mode, open the browser console for the reset token, then visit the reset password page.</p>
          <Button className="w-full" onClick={() => router.push(`${AUTH_ROUTES.resetPassword}?token=demo`)}>
            Go to reset password
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input
                id="email"
                type="email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
