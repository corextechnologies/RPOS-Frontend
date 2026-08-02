"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Receipt, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { updateRestaurantSchema, type UpdateRestaurantForm } from "@/lib/schemas/restaurant";
import { applyPlanOnEdit, resolvePlanTier } from "@/lib/plans/apply-plan";
import { DEFAULT_PLAN_TIER } from "@/lib/plans/catalog";
import { useRestaurant, useRestaurantMutations } from "@/lib/hooks/use-restaurants";
import { useAuth } from "@/lib/auth";
import { USE_MOCK } from "@/lib/api";
import { PlanDetailsCard } from "@/components/plans/PlanDetailsCard";
import { PlanTierSelect } from "@/components/plans/PlanTierSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/types/super-admin";
import { titleCase } from "@/lib/utils";
import { toast } from "sonner";

export default function EditRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth();
  const restaurant = useRestaurant(id);
  const mutations = useRestaurantMutations();
  const [confirm, setConfirm] = useState<"revoke" | "restore" | "delete" | null>(null);
  const [disableConfirm, setDisableConfirm] = useState<UpdateRestaurantForm | null>(null);

  const form = useForm<UpdateRestaurantForm>({
    resolver: zodResolver(updateRestaurantSchema),
    defaultValues: {
      plan_tier: DEFAULT_PLAN_TIER,
      branch_limit: 1,
      owner_email: "",
      owner_phone: "",
      plan_amount: "",
      next_billing_date: "",
      has_central_kitchen: true,
    },
  });

  const planTier = form.watch("plan_tier");
  const planAmount = form.watch("plan_amount");
  const branchLimit = form.watch("branch_limit");
  const nextBillingDate = form.watch("next_billing_date");

  useEffect(() => {
    if (restaurant.data) {
      const tier = resolvePlanTier(restaurant.data.plan_tier);
      form.reset({
        plan_tier: tier,
        branch_limit: restaurant.data.branch_limit,
        owner_email: restaurant.data.admin.email,
        owner_phone: restaurant.data.admin.phone,
        plan_amount: restaurant.data.plan_amount ?? "",
        next_billing_date: restaurant.data.next_billing_date ?? "",
        has_central_kitchen: restaurant.data.has_central_kitchen ?? true,
      });
    }
  }, [restaurant.data, form]);

  const handlePlanChange = (tier: string) => {
    const fields = applyPlanOnEdit(tier, form.getValues("next_billing_date"));
    form.setValue("plan_tier", fields.plan_tier as UpdateRestaurantForm["plan_tier"]);
    form.setValue("plan_amount", fields.plan_amount);
    form.setValue("branch_limit", fields.branch_limit);
  };

  const doUpdate = async (values: UpdateRestaurantForm) => {
    try {
      await mutations.updateRestaurant.mutateAsync({
        id,
        body: {
          plan_tier: values.plan_tier,
          branch_limit: values.branch_limit,
          owner_email: values.owner_email,
          owner_phone: values.owner_phone || undefined,
          plan_amount: values.plan_amount || undefined,
          next_billing_date: values.next_billing_date || undefined,
          has_central_kitchen: values.has_central_kitchen,
        },
      });
    } catch (err) {
      // The guarded disable (mock now, backend later) rejects with a 409. Put the
      // toggle back to on so the form reflects the state that was actually saved.
      if (err instanceof ApiError) {
        form.setValue("has_central_kitchen", true);
        toast.error(err.message);
      } else {
        toast.error("Failed to update restaurant.");
      }
    }
  };

  const onSubmit = async (values: UpdateRestaurantForm) => {
    if (
      USE_MOCK &&
      restaurant.data &&
      values.branch_limit < restaurant.data.branch_count
    ) {
      form.setError("branch_limit", {
        message: `Branch limit cannot be below current branch count (${restaurant.data.branch_count})`,
      });
      return;
    }
    // Disabling an active central kitchen is a big operational change — confirm
    // first, then let doUpdate attempt it (the guard may still reject).
    if (restaurant.data?.has_central_kitchen && !values.has_central_kitchen) {
      setDisableConfirm(values);
      return;
    }
    await doUpdate(values);
  };

  const handleConfirm = async () => {
    if (!confirm || !restaurant.data) return;
    if (confirm === "revoke") await mutations.revokeAccess.mutateAsync(id);
    if (confirm === "restore") await mutations.restoreAccess.mutateAsync(id);
    if (confirm === "delete") {
      await mutations.deleteRestaurant.mutateAsync(id);
      router.push("/super-admin/dashboard");
    }
    setConfirm(null);
    restaurant.refetch();
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
    return <ErrorState title="Restaurant not found" onRetry={() => restaurant.refetch()} />;
  }

  const r = restaurant.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/super-admin/dashboard" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{r.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={r.plan_status === "active" ? "success" : "warning"}>
              Plan: {titleCase(r.plan_status)}
            </Badge>
            {!r.has_central_kitchen && <Badge variant="outline">Branch-only</Badge>}
            {USE_MOCK && (
              <Badge variant={r.admin.access_status === "active" ? "secondary" : "destructive"}>
                Access: {titleCase(r.admin.access_status)}
              </Badge>
            )}
          </div>
        </div>
        {can("billing:read") && (
          <Button variant="outline" asChild>
            <Link href={`/super-admin/restaurants/${id}/billing`}>
              <Receipt className="h-4 w-4" />
              Billing
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit restaurant</CardTitle>
          <CardDescription>Update plan details and owner contact information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="plan_tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <FormControl>
                      <PlanTierSelect
                        value={field.value}
                        onValueChange={(tier) => {
                          field.onChange(tier);
                          handlePlanChange(tier);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PlanDetailsCard
                planTier={planTier}
                planAmount={planAmount}
                branchLimit={branchLimit}
                nextBillingDate={nextBillingDate}
              />

              <FormField
                control={form.control}
                name="has_central_kitchen"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-line bg-surface-2/40 px-4 py-3">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel className="text-base">Central / cloud kitchen</FormLabel>
                      <p className="text-sm text-muted">
                        Turn off if the client has no cloud kitchen — each branch then handles
                        production in its own sub-kitchen. Disabling is blocked while kitchen
                        locations or staff still exist.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                        <Input type="email" {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {can("restaurants:update") && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={mutations.updateRestaurant.isPending}>
                    {mutations.updateRestaurant.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!disableConfirm}
        onOpenChange={(open) => !open && setDisableConfirm(null)}
        title="Disable central kitchen"
        description="This restaurant will run without a cloud kitchen — each branch handles production in its own sub-kitchen, and the kitchen portal and request-forwarding are turned off. Continue?"
        destructive
        confirmLabel="Disable kitchen"
        onConfirm={async () => {
          const values = disableConfirm;
          setDisableConfirm(null);
          if (values) await doUpdate(values);
        }}
        loading={mutations.updateRestaurant.isPending}
      />

      {USE_MOCK && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access management</CardTitle>
            <CardDescription>
              Revoking access suspends the admin&apos;s login without deleting the restaurant.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {r.admin.access_status === "active" && can("admins:revoke") && (
              <Button variant="outline" onClick={() => setConfirm("revoke")}>
                <ShieldOff className="h-4 w-4" />
                Revoke access
              </Button>
            )}
            {r.admin.access_status === "revoked" && can("admins:restore") && (
              <Button variant="outline" onClick={() => setConfirm("restore")}>
                <ShieldCheck className="h-4 w-4" />
                Restore access
              </Button>
            )}
            {can("restaurants:delete") && (
              <Button variant="destructive" onClick={() => setConfirm("delete")}>
                <Trash2 className="h-4 w-4" />
                Delete restaurant
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {USE_MOCK && (
        <>
          <ConfirmDialog
            open={confirm === "revoke"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title="Revoke admin access"
            description={`Suspend login for ${r.admin.name || r.admin.email}? The restaurant will remain but the admin cannot sign in.`}
            destructive
            confirmLabel="Revoke access"
            onConfirm={handleConfirm}
            loading={mutations.revokeAccess.isPending}
          />
          <ConfirmDialog
            open={confirm === "restore"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title="Restore admin access"
            description={`Restore login access for ${r.admin.name || r.admin.email}?`}
            confirmLabel="Restore access"
            onConfirm={handleConfirm}
            loading={mutations.restoreAccess.isPending}
          />
          <ConfirmDialog
            open={confirm === "delete"}
            onOpenChange={(open) => !open && setConfirm(null)}
            title="Delete restaurant"
            description={`Permanently delete ${r.name} and remove its admin. This cannot be undone.`}
            destructive
            typeToConfirm={r.name}
            confirmLabel="Delete"
            onConfirm={handleConfirm}
            loading={mutations.deleteRestaurant.isPending}
          />
        </>
      )}
    </div>
  );
}
