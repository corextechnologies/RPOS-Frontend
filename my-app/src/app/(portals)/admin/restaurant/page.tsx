"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpCircle, ImagePlus, Store, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMyRestaurant, useUpdateMyRestaurant } from "@/lib/hooks/use-admin-restaurant";
import {
  adminRestaurantDefaults,
  adminRestaurantSchema,
  type AdminRestaurantForm,
} from "@/lib/schemas/admin-restaurant";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { titleCase } from "@/lib/utils";

/**
 * Where plan-upgrade requests are sent. The plan/billing card is read-only for
 * admins — commercial changes go through the operator by email. Replace with
 * your operations inbox (or wire the tracked backend flow later).
 */
const PLAN_UPGRADE_EMAIL = "sales@rpos.app";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08-27" -> "August 27, 2026". Parses parts directly to avoid TZ drift. */
function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${Number(day)}, ${year}` : iso;
}

export default function AdminRestaurantPage() {
  const { can } = useAuth();
  const restaurant = useMyRestaurant();
  const update = useUpdateMyRestaurant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<AdminRestaurantForm>({
    resolver: zodResolver(adminRestaurantSchema),
    defaultValues: adminRestaurantDefaults,
  });

  const logoUrl = form.watch("logo_url");

  useEffect(() => {
    if (!restaurant.data) return;
    const r = restaurant.data;
    form.reset({
      name: r.name,
      owner_name: r.admin.name ?? "",
      owner_email: r.admin.email ?? "",
      owner_phone: r.admin.phone ?? "",
      address: r.address ?? "",
      logo_url: r.logo_url ?? "",
    });
  }, [restaurant.data, form]);

  const canEdit = can("restaurant:update");

  const onSubmit = async (values: AdminRestaurantForm) => {
    await update.mutateAsync({
      name: values.name.trim(),
      owner_name: values.owner_name?.trim() || undefined,
      owner_email: values.owner_email.trim(),
      owner_phone: values.owner_phone?.trim() || undefined,
      address: values.address?.trim() ?? "",
      logo_url: values.logo_url ?? "",
    });
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await api.uploadRestaurantLogo(file);
      form.setValue("logo_url", url, { shouldDirty: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload logo");
    } finally {
      setUploading(false);
    }
  };

  if (restaurant.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (restaurant.isError || !restaurant.data) {
    return (
      <ErrorState
        title="Could not load your restaurant"
        onRetry={() => restaurant.refetch()}
      />
    );
  }

  const r = restaurant.data;

  const upgradeHref = (() => {
    const subject = `Plan upgrade request — ${r.name}`;
    const owner = r.admin.name || "—";
    const renewal = formatLongDate(r.next_billing_date);
    const body = [
      "Hi Support Team,",
      "",
      `I would like to request an update to our current software subscription plan for ${r.name}. Below are our account details and the details of the requested changes.`,
      "",
      "Account & Contact Information",
      `- Restaurant / Group Name: ${r.name}`,
      `- Account Owner: ${owner}`,
      `- Primary Email: ${r.admin.email || "—"}`,
      `- Contact Phone: ${r.admin.phone || "—"}`,
      `- Current Account ID / License Key: ${r.id}`,
      "",
      "Current Subscription Details",
      `- Current Tier: ${titleCase(r.plan_tier)} Plan – $${formatPlanAmount(r.plan_amount)}/mo`,
      `- Active Branches: ${r.branch_count} of ${r.branch_limit} allocated`,
      `- Next Billing Renewal: ${renewal}`,
      "",
      "Requested Changes",
      "- New Desired Plan: [Select: Basic / Standard / Premium / Enterprise]",
      "- Total Branches Needed: [Enter total active branches needed]",
      `- Requested Effective Date: [Select: Immediately / Next Billing Cycle (${renewal}) / Specific Date]`,
      "",
      "Reason for Request / Additional Notes",
      "[Briefly state reason, e.g., Opening a new location in September, scaling operations, or downgrading unused seats.]",
      "",
      "Please confirm the following to complete this request:",
      "1. Confirmation of the plan update and effective start date.",
      "2. The prorated cost breakdown (if effective immediately) or the updated recurring billing amount.",
      "3. Any next steps or admin setup required on our end.",
      "",
      "Thank you,",
      owner,
      "[Owner / Managing Director]",
      r.name,
      r.admin.phone || "",
    ].join("\n");
    return `mailto:${PLAN_UPGRADE_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  })();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-muted">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{r.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={r.plan_status === "active" ? "success" : "warning"}>
              Plan: {titleCase(r.plan_status)}
            </Badge>
            <Badge variant="secondary">{titleCase(r.plan_tier)}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant details</CardTitle>
          <CardDescription>
            Update your restaurant name, address, and owner contact information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <FormLabel>Logo</FormLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoFile}
                />
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2 text-muted">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-6 w-6" />
                      )}
                    </div>
                    {logoUrl && canEdit && (
                      <button
                        type="button"
                        onClick={() => form.setValue("logo_url", "", { shouldDirty: true })}
                        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-danger text-white shadow-soft"
                        aria-label="Remove logo"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <>
                          <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-brand" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <ImagePlus className="h-4 w-4" />
                          {logoUrl ? "Replace logo" : "Upload logo"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-faint">PNG, JPG, WEBP, or SVG. Max 2 MB.</p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="owner_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="owner_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner phone</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} disabled={!canEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {canEdit && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                    {update.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan &amp; billing</CardTitle>
          <CardDescription>
            Your plan is managed by your operator. To change it, send an upgrade request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">Plan</dt>
              <dd className="font-medium text-content">{titleCase(r.plan_tier)}</dd>
            </div>
            <div>
              <dt className="text-muted">Monthly amount</dt>
              <dd className="font-medium text-content">{formatPlanAmount(r.plan_amount)}</dd>
            </div>
            <div>
              <dt className="text-muted">Branches</dt>
              <dd className="font-medium text-content">
                {r.branch_count} of {r.branch_limit}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Next billing date</dt>
              <dd className="font-medium text-content">{r.next_billing_date ?? "—"}</dd>
            </div>
          </dl>
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <a href={upgradeHref}>
                <ArrowUpCircle className="h-4 w-4" />
                Request plan upgrade
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
