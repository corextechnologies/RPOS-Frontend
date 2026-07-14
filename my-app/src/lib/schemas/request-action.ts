import { z } from "zod";

export const lineApprovalSchema = z.object({
  line_id: z.string().min(1),
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
      "IN_QUEUE",
      "IN_PRODUCTION",
      "RECEIVED",
    ]),
    notes: z.string().optional(),
    line_approvals: z.array(lineApprovalSchema).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.to_status !== "PARTIALLY_APPROVED") return;

    const approvals = values.line_approvals ?? [];
    if (approvals.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one line approval for partial approval",
        path: ["line_approvals"],
      });
    }
  });

export type RequestActionForm = z.infer<typeof requestActionSchema>;
