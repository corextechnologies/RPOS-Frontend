import { z } from "zod";

export const kitchenRequestLineSchema = z.object({
  product_id: z.string().min(1, "Select a product"),
  quantity_requested: z.string().refine((value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0;
  }, "Enter a whole quantity greater than 0"),
});

export const createKitchenWarehouseRequestSchema = z.object({
  // Required: a restaurant can run several warehouses, and this picks which one
  // gets debited. There is no server-side default.
  warehouse_id: z.string().min(1, "Choose a warehouse"),
  lines: z.array(kitchenRequestLineSchema).min(1, "Add at least one line"),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export type CreateKitchenWarehouseRequestForm = z.infer<
  typeof createKitchenWarehouseRequestSchema
>;

export const kitchenRequestLineDefaults = {
  product_id: "",
  quantity_requested: "",
};

export const createKitchenWarehouseRequestDefaults: CreateKitchenWarehouseRequestForm =
  {
    warehouse_id: "",
    lines: [kitchenRequestLineDefaults],
    notes: "",
  };
