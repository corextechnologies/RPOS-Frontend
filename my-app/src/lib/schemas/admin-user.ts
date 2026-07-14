import { z } from "zod";
import type { AdminCreatableRole } from "@/lib/types/admin";

export const adminCreatableRoles = [
  "BRANCH_MANAGER",
  "KITCHEN_MANAGER",
  "WAREHOUSE_MANAGER",
] as const satisfies readonly AdminCreatableRole[];

export const createAdminUserSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    role: z.enum(adminCreatableRoles),
    branch_id: z.string().optional(),
    kitchen_id: z.string().optional(),
    warehouse_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.role === "BRANCH_MANAGER" && !values.branch_id) {
      ctx.addIssue({
        code: "custom",
        message: "Select a branch",
        path: ["branch_id"],
      });
    }
    if (values.role === "KITCHEN_MANAGER" && !values.kitchen_id) {
      ctx.addIssue({
        code: "custom",
        message: "Select a kitchen",
        path: ["kitchen_id"],
      });
    }
    if (values.role === "WAREHOUSE_MANAGER" && !values.warehouse_id) {
      ctx.addIssue({
        code: "custom",
        message: "Select a warehouse",
        path: ["warehouse_id"],
      });
    }
  });

export type CreateAdminUserForm = z.infer<typeof createAdminUserSchema>;

export const createAdminUserDefaults: CreateAdminUserForm = {
  full_name: "",
  email: "",
  role: "BRANCH_MANAGER",
  branch_id: "",
  kitchen_id: "",
  warehouse_id: "",
};

export const updateAdminUserSchema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    is_active: z.boolean(),
    role: z.enum(adminCreatableRoles),
    branch_id: z.string().optional(),
    kitchen_id: z.string().optional(),
    warehouse_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.role === "BRANCH_MANAGER" && !values.branch_id) {
      ctx.addIssue({ code: "custom", message: "Select a branch", path: ["branch_id"] });
    }
    if (values.role === "KITCHEN_MANAGER" && !values.kitchen_id) {
      ctx.addIssue({ code: "custom", message: "Select a kitchen", path: ["kitchen_id"] });
    }
    if (values.role === "WAREHOUSE_MANAGER" && !values.warehouse_id) {
      ctx.addIssue({ code: "custom", message: "Select a warehouse", path: ["warehouse_id"] });
    }
  });

export type UpdateAdminUserForm = z.infer<typeof updateAdminUserSchema>;
