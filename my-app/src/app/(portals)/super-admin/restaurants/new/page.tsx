"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  createRestaurantDefaults,
  createRestaurantSchema,
  type CreateRestaurantForm,
} from "@/lib/schemas/restaurant";
import { applyPlanOnCreate } from "@/lib/plans/apply-plan";
import { useRestaurantMutations } from "@/lib/hooks/use-restaurants";
import { PlanDetailsCard } from "@/components/plans/PlanDetailsCard";
import { PlanTierSelect } from "@/components/plans/PlanTierSelect";
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
import { Switch } from "@/components/ui/switch";
import { CredentialsDialog } from "@/components/ui/credentials-dialog";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

export default function NewRestaurantPage() {
  const router = useRouter();
  const { createRestaurant } = useRestaurantMutations();
  const [credentials, setCredentials] = useState<{
    restaurantName: string;
    email: string;
    temporaryPassword?: string;
    credentialEmailSent: boolean;
  } | null>(null);

  const form = useForm<CreateRestaurantForm>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: createRestaurantDefaults,
  });

  const planTier = form.watch("plan_tier");
  const planAmount = form.watch("plan_amount");
  const branchLimit = form.watch("branch_limit");
  const nextBillingDate = form.watch("next_billing_date");

  const handlePlanChange = (tier: string) => {
    const fields = applyPlanOnCreate(tier);
    form.setValue("plan_tier", fields.plan_tier as CreateRestaurantForm["plan_tier"]);
    form.setValue("plan_amount", fields.plan_amount);
    form.setValue("branch_limit", fields.branch_limit);
    form.setValue("next_billing_date", fields.next_billing_date);
  };

  const onSubmit = async (values: CreateRestaurantForm) => {
    try {
      const result = await createRestaurant.mutateAsync({
        name: values.name,
        owner_name: values.owner_name || undefined,
        owner_email: values.owner_email,
        owner_phone: values.owner_phone || undefined,
        branch_limit: values.branch_limit,
        plan_tier: values.plan_tier,
        plan_amount: values.plan_amount,
        has_central_kitchen: values.has_central_kitchen,
        payment_received: values.payment_received === true,
      });
      setCredentials({
        restaurantName: result.restaurant.name,
        email: result.admin_email,
        temporaryPassword: result.temporary_password,
        credentialEmailSent: result.credential_email_sent,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === "conflict") {
        toast.error("A user with this email already exists.");
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to create restaurant.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/super-admin/dashboard" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Add restaurant</h1>
          <p className="text-sm text-muted">Create a restaurant and its owner admin in one step.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant & admin details</CardTitle>
          <CardDescription>
            The admin account is created together with the restaurant. Owner email becomes the admin login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sunset Bistro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="owner_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex Rivera" {...field} />
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
                        <Input placeholder="+1 555 010 2000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="owner_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner email (admin login)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="owner@restaurant.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        On for tenants that run a central kitchen. Turn off if the client has no
                        cloud kitchen — each branch then handles production in its own sub-kitchen.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_received"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-line bg-surface-2/40 px-4 py-3">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel className="text-base">Payment received</FormLabel>
                      <p className="text-sm text-muted">
                        Tick if the customer has already paid. Creates a paid invoice for today and
                        an unpaid invoice for next month.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/super-admin/dashboard">Cancel</Link>
                </Button>
                <Button type="submit" disabled={createRestaurant.isPending}>
                  {createRestaurant.isPending ? "Creating…" : "Create restaurant & admin"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {credentials && (
        <CredentialsDialog
          open={!!credentials}
          onOpenChange={() => {}}
          restaurantName={credentials.restaurantName}
          email={credentials.email}
          temporaryPassword={credentials.temporaryPassword}
          credentialEmailSent={credentials.credentialEmailSent}
          onDone={() => router.push("/super-admin/dashboard")}
        />
      )}
    </div>
  );
}
