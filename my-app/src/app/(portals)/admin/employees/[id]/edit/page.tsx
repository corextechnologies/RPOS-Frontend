"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeImageField } from "@/components/admin/employees/EmployeeImageField";
import { StaffDocumentField } from "@/components/staff/StaffDocumentField";
import { api } from "@/lib/api";
import { useEmployees, useUpdateEmployee } from "@/lib/hooks/use-employees";
import { useBranches, useKitchens, useWarehouses } from "@/lib/hooks/use-locations";
import {
  updateAdminUserSchema,
  type UpdateAdminUserForm,
} from "@/lib/schemas/admin-user";
import type { AdminCreatableRole, UpdateAdminUserInput } from "@/lib/types/admin";
import { ApiError } from "@/lib/types/super-admin";

const ROLE_LABELS: Record<AdminCreatableRole, string> = {
  BRANCH_MANAGER: "Branch manager",
  KITCHEN_MANAGER: "Kitchen manager",
  WAREHOUSE_MANAGER: "Warehouse manager",
};

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const employees = useEmployees(1);
  const updateEmployee = useUpdateEmployee();
  const branches = useBranches();
  const kitchens = useKitchens();
  const warehouses = useWarehouses();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const employee = useMemo(
    () => employees.data?.items.find((item) => item.id === id),
    [employees.data, id],
  );

  const role = (employee?.role ?? "BRANCH_MANAGER") as AdminCreatableRole;

  const form = useForm<UpdateAdminUserForm>({
    resolver: zodResolver(updateAdminUserSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      address: "",
      image_url: "",
      cnic_front_url: "",
      cnic_back_url: "",
      is_active: true,
      role,
      branch_id: "",
      kitchen_id: "",
      warehouse_id: "",
    },
  });

  useEffect(() => {
    if (!employee) return;
    form.reset({
      full_name: employee.full_name,
      email: employee.email,
      phone_number: employee.phone_number ?? "",
      address: employee.address ?? "",
      image_url: employee.image_url ?? "",
      cnic_front_url: employee.cnic_front_url ?? "",
      cnic_back_url: employee.cnic_back_url ?? "",
      is_active: employee.is_active,
      role: employee.role as AdminCreatableRole,
      branch_id: employee.branch_id ?? "",
      kitchen_id: employee.kitchen_id ?? "",
      warehouse_id: employee.warehouse_id ?? "",
    });
  }, [employee, form]);

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

  const onSubmit = async (values: UpdateAdminUserForm) => {
    setErrorMessage(undefined);

    const body: UpdateAdminUserInput = {
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      // Sent even when blank so a manager can clear a field.
      phone_number: values.phone_number?.trim() ?? "",
      address: values.address?.trim() ?? "",
      image_url: values.image_url ?? "",
      cnic_front_url: values.cnic_front_url ?? "",
      cnic_back_url: values.cnic_back_url ?? "",
      is_active: values.is_active,
    };
    if (values.role === "BRANCH_MANAGER") body.branch_id = values.branch_id;
    if (values.role === "KITCHEN_MANAGER") body.kitchen_id = values.kitchen_id;
    if (values.role === "WAREHOUSE_MANAGER") body.warehouse_id = values.warehouse_id;

    try {
      await updateEmployee.mutateAsync({ id, body });
      router.push("/admin/employees");
    } catch (err) {
      // The one edit-specific failure worth its own copy: email collides with
      // another user (backend returns 409 `conflict`).
      if (err instanceof ApiError && err.status === 409) {
        setErrorMessage("That email is already used by another user.");
      } else if (err instanceof ApiError || err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update employee.");
      }
    }
  };

  if (employees.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (employees.isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/employees" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Failed to load employee"
          description="Could not load employees for editing."
          onRetry={() => employees.refetch()}
        />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/employees" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Employee not found"
          description="This employee is missing or was deleted."
          onRetry={() => employees.refetch()}
        />
      </div>
    );
  }

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
            Edit employee
          </h1>
          <p className="text-sm text-muted">
            {ROLE_LABELS[role]} · {employee.email}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manager details</CardTitle>
          <CardDescription>
            Update the manager&apos;s details, status, and assigned{" "}
            {locationLabel.toLowerCase()}. The role cannot be changed here.
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
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+92 300 1234567"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12 Mall Road, Lahore"
                        {...field}
                        value={field.value ?? ""}
                      />
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
                    <FormLabel>Photo</FormLabel>
                    <FormControl>
                      <EmployeeImageField
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        upload={(file) => api.uploadStaffDocument(file, "personal")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnic_front_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNIC — front</FormLabel>
                    <FormControl>
                      <StaffDocumentField
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        label="CNIC front"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnic_back_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNIC — back</FormLabel>
                    <FormControl>
                      <StaffDocumentField
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        label="CNIC back"
                      />
                    </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-line bg-surface-2/40 px-4 py-3">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel className="text-base">Active</FormLabel>
                      <p className="text-sm text-muted">
                        Inactive managers cannot sign in until reactivated.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/employees">Cancel</Link>
                </Button>
                <Button type="submit" disabled={updateEmployee.isPending}>
                  {updateEmployee.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
