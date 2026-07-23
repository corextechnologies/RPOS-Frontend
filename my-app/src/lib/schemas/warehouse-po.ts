import { z } from "zod";
import { positiveQtyString } from "@/lib/schemas/quantity";

export const purchaseOrderLineSchema = z.object({
  product_id: z.string().min(1, "Select a product"),
  quantity_requested: positiveQtyString(),
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
