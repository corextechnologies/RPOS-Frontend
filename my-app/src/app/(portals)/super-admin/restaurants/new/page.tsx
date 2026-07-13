"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createRestaurantSchema, type CreateRestaurantForm } from "@/lib/schemas/restaurant";
import { useRestaurantMutations } from "@/lib/hooks/use-restaurants";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CredentialsDialog } from "@/components/ui/credentials-dialog";

export default function NewRestaurantPage() {
  const router = useRouter();
  const { createRestaurant } = useRestaurantMutations();
  const [credentials, setCredentials] = useState<{
    restaurantName: string;
    email: string;
    temporaryPassword: string;
    emailed: boolean;
  } | null>(null);

  const form = useForm<CreateRestaurantForm>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      name: "",
      owner_name: "",
      owner_email: "",
      owner_phone: "",
      branch_count: 1,
      plan_tier: "starter",
    },
  });

  const onSubmit = async (values: CreateRestaurantForm) => {
    const result = await createRestaurant.mutateAsync(values);
    setCredentials({
      restaurantName: result.restaurant.name,
      email: result.credentials.email,
      temporaryPassword: result.credentials.temporary_password,
      emailed: result.credentials.emailed,
    });
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
            The admin account is created together with the restaurant. Login credentials are generated automatically.
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
                      <FormLabel>Owner name</FormLabel>
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
                    <FormLabel>Owner email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="owner@restaurant.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="branch_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial branch count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                        />
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
                      <FormLabel>Plan tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="starter">Starter — $49/mo</SelectItem>
                          <SelectItem value="growth">Growth — $149/mo</SelectItem>
                          <SelectItem value="enterprise">Enterprise — $399/mo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
          emailed={credentials.emailed}
          onDone={() => router.push("/super-admin/dashboard")}
        />
      )}
    </div>
  );
}
