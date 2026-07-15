import { z } from "zod";

export const purchaseOrderLineSchema = z.object({
  product_id: z.string().min(1, "Select a product"),
  quantity_requested: z
    .string()
    .refine((value) => {
      const n = Number(value);
      return Number.isInteger(n) && n > 0;
    }, "Enter a whole quantity greater than 0"),
});

export const createPurchaseOrderSchema = z.object({
  lines: z.array(purchaseOrderLineSchema).min(1, "Add at least one line"),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export type CreatePurchaseOrderForm = z.infer<typeof createPurchaseOrderSchema>;

export const purchaseOrderLineDefaults: CreatePurchaseOrderForm["lines"][number] = {
  product_id: "",
  quantity_requested: "",
};

export const createPurchaseOrderDefaults: CreatePurchaseOrderForm = {
  lines: [purchaseOrderLineDefaults],
  notes: "",
};
