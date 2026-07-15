import { z } from "zod";

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
});

export type ReceiveStockForm = z.infer<typeof receiveStockSchema>;

export const receiveStockDefaults: ReceiveStockForm = {
  product_id: "",
  quantity: "",
  batch_code: "",
  expiry_date: "",
  notes: "",
};

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
  movement_type: z.enum(["WASTE", "EXPIRY"]),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export type WasteStockForm = z.infer<typeof wasteStockSchema>;

export const wasteStockDefaults: WasteStockForm = {
  quantity: "",
  movement_type: "WASTE",
  notes: "",
};
