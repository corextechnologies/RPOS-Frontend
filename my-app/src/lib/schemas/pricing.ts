import { z } from "zod";

export const updatePricingSchema = z.object({
  cost_price: z
    .number({ error: "Enter a valid cost price" })
    .min(0, "Cost must be 0 or greater"),
});

export type UpdatePricingForm = z.infer<typeof updatePricingSchema>;
