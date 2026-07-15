import { z } from "zod";

export const adminSettingsSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  image_url: z
    .string()
    .max(1024, "URL is too long")
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      "Enter a valid image URL",
    ),
});

export type AdminSettingsForm = z.infer<typeof adminSettingsSchema>;

export const adminSettingsDefaults: AdminSettingsForm = {
  full_name: "",
  image_url: "",
};
