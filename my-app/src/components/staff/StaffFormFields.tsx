"use client";

import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { api } from "@/lib/api";
import { EmployeeImageField } from "@/components/admin/employees/EmployeeImageField";
import { StaffDocumentField } from "@/components/staff/StaffDocumentField";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/**
 * The eight staff fields every portal collects, in the agreed order:
 *
 *   1 Name · 2 Photo · 3 Email · 4 Phone · 5 Address · 6 Role · 7/8 CNIC
 *
 * Field 6 is the only one that differs between portals — Branch needs a typed
 * `position` dropdown (the POS derives capabilities from it, so free text would
 * grant nothing), Kitchen and Warehouse take free-text `job_title`, and Admin
 * picks a role plus a location. So it is passed in as `roleField` and rendered
 * in the right slot rather than being branched on here.
 *
 * Generic over the form shape: every caller's values include these seven keys,
 * so the `Path<T>` casts below are safe — they only exist because TypeScript
 * cannot infer that from the constraint alone.
 */
interface StaffFieldShape {
  full_name: string;
  email: string;
  phone_number: string;
  address: string;
  image_url: string;
  cnic_front_url: string;
  cnic_back_url: string;
}

export function StaffFormFields<T extends FieldValues & StaffFieldShape>({
  control,
  roleField,
  namePlaceholder = "Sara Khan",
  emailPlaceholder = "sara@example.com",
}: {
  control: Control<T>;
  /** Field 6, rendered between Address and the CNIC scans. */
  roleField: ReactNode;
  namePlaceholder?: string;
  emailPlaceholder?: string;
}) {
  const path = (key: keyof StaffFieldShape) => key as Path<T>;

  return (
    <>
      <FormField
        control={control}
        name={path("full_name")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full name</FormLabel>
            <FormControl>
              <Input placeholder={namePlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={path("image_url")}
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
        control={control}
        name={path("email")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder={emailPlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={path("phone_number")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone number</FormLabel>
            <FormControl>
              <Input type="tel" placeholder="+92 300 1234567" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={path("address")}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Input placeholder="12 Mall Road, Lahore" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {roleField}

      <FormField
        control={control}
        name={path("cnic_front_url")}
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
        control={control}
        name={path("cnic_back_url")}
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
    </>
  );
}
