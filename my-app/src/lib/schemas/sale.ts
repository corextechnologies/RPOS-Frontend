import { z } from "zod";

export const recordSaleSchema = z.object({
  amount: z
    .string()
    .refine((value) => {
      const n = parseFloat(value);
      return Number.isFinite(n) && n > 0;
    }, "Enter an amount greater than 0"),
  occurred_at: z.string().optional(),
  branch_id: z.string().optional(),
  note: z.string().max(500, "Note must be 500 characters or fewer").optional(),
});

export type RecordSaleForm = z.infer<typeof recordSaleSchema>;

export const recordSaleDefaults: RecordSaleForm = {
  amount: "",
  occurred_at: "",
  branch_id: "",
  note: "",
};
