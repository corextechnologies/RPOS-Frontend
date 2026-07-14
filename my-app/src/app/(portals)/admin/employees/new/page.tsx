"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialsDialog } from "@/components/ui/credentials-dialog";
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
import { useCreateUser } from "@/lib/hooks/use-employees";
import { useBranches, useKitchens, useWarehouses } from "@/lib/hooks/use-locations";
import {
  createAdminUserDefaults,
  createAdminUserSchema,
  type CreateAdminUserForm,
} from "@/lib/schemas/admin-user";
import type { AdminCreatableRole, CreateAdminUserInput } from "@/lib/types/admin";
import { ApiError } from "@/lib/types/super-admin";

const ROLE_OPTIONS: { value: AdminCreatableRole; label: string }[] = [
  { value: "BRANCH_MANAGER", label: "Branch manager" },
  { value: "KITCHEN_MANAGER", label: "Kitchen manager" },
  { value: "WAREHOUSE_MANAGER", label: "Warehouse manager" },
];

export default function NewEmployeePage() {
  const router = useRouter();
  const createUser = useCreateUser();
  const branches = useBranches();
  const kitchens = useKitchens();
  const warehouses = useWarehouses();

  const [credentials, setCredentials] = useState<{
    locationName: string;
    email: string;
    temporaryPassword?: string;
    credentialEmailSent: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const form = useForm<CreateAdminUserForm>({
    resolver: zodResolver(createAdminUserSchema),
    defaultValues: createAdminUserDefaults,
  });

  const role = form.watch("role");

  const locationOptions = useMemo(() => {
    if (role === "BRANCH_MANAGER") {
      return (branches.data ?? []).map((b) => ({ id: b.id, name: b.name }));
    }
    if (role === "KITCHEN_MANAGER") {
      return (kitchens.data ?? []).map((k) => ({ id: k.id, name: k.name }));
    }
    return (warehouses.data ?? []).map((w) => ({ id: w.id, name: w.name }));
  }, [role, branches.data, kitchens.data, warehouses.data]);

  const locationField =
    role === "BRANCH_MANAGER"
      ? "branch_id"
      : role === "KITCHEN_MANAGER"
        ? "kitchen_id"
        : "warehouse_id";

  const locationLabel =
    role === "BRANCH_MANAGER" ? "Branch" : role === "KITCHEN_MANAGER" ? "Kitchen" : "Warehouse";

  const emptyHint =
    role === "BRANCH_MANAGER"
      ? "Create a branch first before assigning a branch manager."
      : role === "KITCHEN_MANAGER"
        ? "Create a kitchen first before assigning a kitchen manager."
        : "Create a warehouse first before assigning a warehouse manager.";

  const handleRoleChange = (next: AdminCreatableRole) => {
    form.setValue("role", next);
    form.setValue("branch_id", "");
    form.setValue("kitchen_id", "");
    form.setValue("warehouse_id", "");
    form.clearErrors(["branch_id", "kitchen_id", "warehouse_id"]);
  };

  const onSubmit = async (values: CreateAdminUserForm) => {
    setErrorMessage(undefined);

    const body: CreateAdminUserInput = {
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      role: values.role,
    };
    if (values.role === "BRANCH_MANAGER") body.branch_id = values.branch_id;
    if (values.role === "KITCHEN_MANAGER") body.kitchen_id = values.kitchen_id;
    if (values.role === "WAREHOUSE_MANAGER") body.warehouse_id = values.warehouse_id;

    const locationName =
      locationOptions.find(
        (o) =>
          o.id ===
          (values.role === "BRANCH_MANAGER"
            ? values.branch_id
            : values.role === "KITCHEN_MANAGER"
              ? values.kitchen_id
              : values.warehouse_id),
      )?.name ?? locationLabel;

    try {
      const result = await createUser.mutateAsync(body);
      setCredentials({
        locationName,
        email: result.email,
        temporaryPassword: result.temporary_password,
        credentialEmailSent: result.credential_email_sent,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to create manager.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/employees" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Add manager
          </h1>
          <p className="text-sm text-muted">
            Provision a branch, kitchen, or warehouse manager and email credentials.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manager details</CardTitle>
          <CardDescription>
            Only location managers can be created here. Admin and Super Admin roles are not available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sam Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (login)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="manager@restaurant.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => handleRoleChange(v as AdminCreatableRole)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={locationField}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{locationLabel}</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={locationOptions.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${locationLabel.toLowerCase()}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locationOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {locationOptions.length === 0 && (
                      <p className="text-sm text-muted">{emptyHint}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/employees">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={createUser.isPending || locationOptions.length === 0}
                >
                  {createUser.isPending ? "Creating…" : "Create manager"}
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
          restaurantName={credentials.locationName}
          email={credentials.email}
          temporaryPassword={credentials.temporaryPassword}
          credentialEmailSent={credentials.credentialEmailSent}
          title="Manager created"
          description={
            credentials.temporaryPassword
              ? "Share these credentials with the manager. They will only be shown once."
              : "The manager account has been provisioned. Login credentials were sent by email."
          }
          contextLabel={locationLabel}
          onDone={() => router.push("/admin/employees")}
        />
      )}
    </div>
  );
}
