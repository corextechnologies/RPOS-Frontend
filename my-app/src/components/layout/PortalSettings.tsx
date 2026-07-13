"use client";

import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { USE_MOCK } from "@/lib/api";
import { AUTH_ROUTES } from "@/lib/auth/actions";
import { displayName } from "@/lib/types/super-admin";
import type { UserRole } from "@/lib/types/super-admin";
import { PORTAL_LABEL } from "@/lib/auth/roles";

export function PortalSettings({ role }: { role: UserRole }) {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">{PORTAL_LABEL[role]} account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Signed-in account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted">Name:</span> {user ? displayName(user) : "—"}
          </p>
          <p>
            <span className="text-muted">Email:</span> {user?.email}
          </p>
          <p>
            <span className="text-muted">Role:</span> {user?.role ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Mode:{" "}
            <span className="font-medium text-content">
              {USE_MOCK ? "Mock API (localStorage)" : "Live API"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        onClick={async () => {
          await logout();
          window.location.assign(AUTH_ROUTES.login);
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
