"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Receipt, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { updateRestaurantSchema, type UpdateRestaurantForm } from "@/lib/schemas/restaurant";
import { useRestaurant, useRestaurantMutations } from "@/lib/hooks/use-restaurants";
import { useAuth } from "@/lib/auth";
import { USE_MOCK } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { titleCase } from "@/lib/utils";

export default function EditRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { can } = useAuth();
  const restaurant = useRestaurant(id);
  const mutations = useRestaurantMutations();
  const [confirm, setConfirm] = useState<"revoke" | "restore" | "delete" | null>(null);

  const form = useForm<UpdateRestaurantForm>({
    resolver: zodResolver(updateRestaurantSchema),
    defaultValues: {
      plan_tier: "starter",
      branch_limit: 1,
      owner_email: "",
      owner_phone: "",
      plan_amount: "",
      next_billing_date: "",
    },
  });

  useEffect(() => {
    if (restaurant.data) {
      form.reset({
        plan_tier: (restaurant.data.plan_tier as UpdateRestaurantForm["plan_tier"]) ?? "starter",
        branch_limit: restaurant.data.branch_limit,
        owner_email: restaurant.data.admin.email,
        owner_phone: restaurant.data.admin.phone,
        plan_amount: restaurant.data.plan_amount ?? "",
        next_billing_date: restaurant.data.next_billing_date ?? "",
      });
    }
  }, [restaurant.data, form]);

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
    await mutations.updateRestaurant.mutateAsync({
      id,
      body: {
        plan_tier: values.plan_tier,
        branch_limit: values.branch_limit,
        owner_email: values.owner_email,
        owner_phone: values.owner_phone || undefined,
        plan_amount: values.plan_amount || undefined,
        next_billing_date: values.next_billing_date || undefined,
      },
    });
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
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="plan_tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="branch_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Branch limit
                        {USE_MOCK && r.branch_count > 0 ? ` (current: ${r.branch_count})` : ""}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={USE_MOCK ? r.branch_count : 1}
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="plan_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan amount</FormLabel>
                      <FormControl>
                        <Input placeholder="199.00" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="next_billing_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next billing date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
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
