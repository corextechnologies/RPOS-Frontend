"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { USE_MOCK } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES } from "@/lib/auth/actions";
import {
  useAdminSettings,
  useUpdateAdminSettings,
} from "@/lib/hooks/use-admin-settings";
import {
  adminSettingsDefaults,
  adminSettingsSchema,
  type AdminSettingsForm,
} from "@/lib/schemas/admin-settings";
import { initials } from "@/lib/utils";

export function AdminSettingsView() {
  const { logout, refresh } = useAuth();
  const settings = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const form = useForm<AdminSettingsForm>({
    resolver: zodResolver(adminSettingsSchema),
    defaultValues: adminSettingsDefaults,
  });

  useEffect(() => {
    if (!settings.data) return;
    form.reset({
      full_name: settings.data.full_name ?? "",
      image_url: settings.data.image_url ?? "",
    });
  }, [settings.data, form]);

  const previewName = form.watch("full_name");
  const previewImage = form.watch("image_url");

  const onSubmit = async (values: AdminSettingsForm) => {
    setErrorMessage(undefined);
    try {
      await updateSettings.mutateAsync({
        full_name: values.full_name.trim(),
        image_url: values.image_url,
      });
      await refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update profile.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Admin account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name and profile picture.</CardDescription>
        </CardHeader>
        <CardContent>
          {settings.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : settings.isError ? (
            <ErrorState
              description="Failed to load your profile."
              onRetry={() => settings.refetch()}
            />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="flex items-center gap-4">
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 bg-cover bg-center text-lg font-medium text-muted"
                    style={
                      previewImage
                        ? { backgroundImage: `url(${JSON.stringify(previewImage)})` }
                        : undefined
                    }
                    aria-hidden
                  >
                    {!previewImage && initials(previewName || settings.data?.email || "")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">
                      {settings.data?.email}
                    </p>
                    <p className="text-xs text-muted">{settings.data?.role}</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Owner" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile picture URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://cdn.example.com/me.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
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
