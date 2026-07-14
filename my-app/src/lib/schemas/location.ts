import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().optional(),
});

export type LocationForm = z.infer<typeof locationSchema>;

export const locationDefaults: LocationForm = { name: "", location: "" };
