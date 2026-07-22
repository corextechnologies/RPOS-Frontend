import { z } from "zod";
import { wasteReasonSchema } from "@/lib/stock/waste-reason";
import { STOCK_UNITS } from "@/lib/stock-unit";

export const receiveStockSchema = z.object({
  product_id: z.string().min(1, "Select a product"),
  quantity: z
    .string()
    .refine((value) => {
      const n = Number(value);
      return Number.isInteger(n) && n > 0;
    }, "Enter a whole quantity greater than 0"),
  batch_code: z
    .string()
    .max(100, "Batch code must be 100 characters or fewer")
    .optional(),
  expiry_date: z.string().optional(),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
  /**
   * Optional low-stock limit, set while adding the item. Blank means "leave it
   * as it is" — and if none was ever set, no alert will ever fire.
   */
  reorder_level: z
    .string()
    .refine((value) => {
      if (value === "") return true;
      const n = Number(value);
      return Number.isInteger(n) && n >= 0;
    }, "Enter a whole number of 0 or more")
    .optional(),
});

export type ReceiveStockForm = z.infer<typeof receiveStockSchema>;

export const receiveStockDefaults: ReceiveStockForm = {
  product_id: "",
  quantity: "",
  batch_code: "",
  expiry_date: "",
  notes: "",
  reorder_level: "",
};

export const createWarehouseProductSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  sku: z.string().max(100, "SKU must be 100 characters or fewer").optional(),
  /**
   * Only the two the warehouse may create. `FINISHED_GOOD` is absent because
   * the kitchen makes those — sending one is a 422, and a form that can't offer
   * it can't trigger that.
   */
  kind: z.enum(["RAW_MATERIAL", "RESALE"]),
  /** Unit of measure the product is stocked and counted in. */
  stock_unit: z.enum(STOCK_UNITS),
});

export type CreateWarehouseProductForm = z.infer<
  typeof createWarehouseProductSchema
>;

export const createWarehouseProductDefaults: CreateWarehouseProductForm = {
  name: "",
  sku: "",
  // Most of what a warehouse buys is consumed, not resold.
  kind: "RAW_MATERIAL",
  // Discrete items are the common case; measures are chosen explicitly.
  stock_unit: "EACH",
};

/**
 * Editing an existing product's catalog metadata.
 *
 * Deliberately mirrors {@link createWarehouseProductSchema} minus the create-only
 * concerns — and, critically, carries NO quantity field. Stock lives on
 * inventory rows behind the stock endpoints, so an edit built on this schema
 * cannot change on-hand no matter what the form renders.
 */
export const updateWarehouseProductSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  sku: z.string().max(100, "SKU must be 100 characters or fewer").optional(),
  /**
   * The two kinds a warehouse may own. `FINISHED_GOOD` is absent for the same
   * reason as on create — the kitchen makes those, and a form that can't offer
   * it can't send one.
   */
  kind: z.enum(["RAW_MATERIAL", "RESALE"]),
  /** Unit of measure the product is stocked and counted in. */
  stock_unit: z.enum(STOCK_UNITS),
});

export type UpdateWarehouseProductForm = z.infer<
  typeof updateWarehouseProductSchema
>;

/**
 * Editing a batch's expiry date. Blank clears it (non-perishable / unbatched).
 */
export const updateStockExpirySchema = z.object({
  expiry_date: z
    .string()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Enter a valid date",
    )
    .optional(),
});

export type UpdateStockExpiryForm = z.infer<typeof updateStockExpirySchema>;

export const adjustStockSchema = z.object({
  quantity_delta: z
    .string()
    .refine((value) => {
      const n = Number(value);
      return Number.isInteger(n) && n !== 0;
    }, "Enter a whole number other than 0"),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export type AdjustStockForm = z.infer<typeof adjustStockSchema>;

export const adjustStockDefaults: AdjustStockForm = {
  quantity_delta: "",
  notes: "",
};

export const wasteStockSchema = z.object({
  quantity: z
    .string()
    .refine((value) => {
      const n = Number(value);
      return Number.isInteger(n) && n > 0;
    }, "Enter a whole quantity greater than 0"),
  /**
   * Optional on this endpoint, unlike the kitchen's — but required here anyway.
   * Waste-rate analytics aggregates on it, and a write-off logged without a
   * reason can never be reported on afterwards. Better to insist now than to
   * discover the gap when someone asks what all the waste was.
   */
  waste_reason: wasteReasonSchema,
  movement_type: z.enum(["WASTE", "EXPIRY"]),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export type WasteStockForm = z.infer<typeof wasteStockSchema>;

export const wasteStockDefaults: WasteStockForm = {
  quantity: "",
  waste_reason: "SPOILAGE",
  movement_type: "WASTE",
  notes: "",
};
