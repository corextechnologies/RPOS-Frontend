import { z } from "zod";

/** The key is `line_item_id`, from `line_items[].id` — never `product_id`. */
export const lineApprovalSchema = z.object({
  line_item_id: z.string().min(1),
  quantity_approved: z.number().min(0, "Quantity must be 0 or greater"),
});

export const requestActionSchema = z
  .object({
    to_status: z.enum([
      "PENDING",
      "APPROVED",
      "REJECTED",
      "PARTIALLY_APPROVED",
      "FORWARDED_TO_KITCHEN",
      // DISPATCHED replaced IN_QUEUE in Phase 4.1.
      "DISPATCHED",
      "REPORTED",
      "RESOLVED",
      "IN_PRODUCTION",
      "PRODUCED",
      "ALLOCATED",
      "RECEIVED",
    ]),
    notes: z.string().optional(),
    line_approvals: z.array(lineApprovalSchema).optional(),
    target_location_type: z.literal("KITCHEN").optional(),
    target_location_id: z.string().min(1).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.to_status === "PARTIALLY_APPROVED") {
      const approvals = values.line_approvals ?? [];
      if (approvals.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one line approval for partial approval",
          path: ["line_approvals"],
        });
      }
      return;
    }

    // The API has no default kitchen: a forward without a target is a 409.
    // Catching it here keeps the round-trip out of the common mistake.
    if (values.to_status === "FORWARDED_TO_KITCHEN" && !values.target_location_id) {
      ctx.addIssue({
        code: "custom",
        message: "Choose the kitchen to forward this request to",
        path: ["target_location_id"],
      });
    }
  });

export type RequestActionForm = z.infer<typeof requestActionSchema>;
