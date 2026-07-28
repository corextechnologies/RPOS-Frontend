import { requestUpload } from "./client";
import { apiConfig } from "./config";
import type { StaffDocumentKind } from "@/lib/types/staff";

/**
 * Staff document uploads — shared by all four portals.
 *
 * `POST /v1/uploads/staff-document` is deliberately not namespaced under a
 * portal: ADMIN, BRANCH_MANAGER, WAREHOUSE_MANAGER and KITCHEN_MANAGER all call
 * the same route, so it lives in its own module rather than being duplicated
 * into four portal API files (the mistake the older per-portal upload routes
 * made).
 *
 * `kind` decides how the server resizes the file — `personal` down to 400px for
 * an avatar, `cnic` to 1600px at higher quality, because an ID number is
 * unreadable at avatar size.
 *
 * Every one of these lands in a PRIVATE bucket, so the returned URL is a signed
 * link that EXPIRES (~15 minutes). Never persist it: store the record, re-fetch
 * when you need to render it again. See `@/lib/types/staff`.
 */
export const uploadsApi = {
  async uploadStaffDocument(
    file: File,
    kind: StaffDocumentKind,
  ): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const data = await requestUpload<{ key?: string; url: string }>(
      "/uploads/staff-document",
      form,
    );
    const url = data.url;
    // Signed URLs are absolute; only a relative fallback needs the API origin.
    if (url.startsWith("/")) {
      const origin = apiConfig.baseUrl.replace(/\/v1$/, "");
      return `${origin}${url}`;
    }
    return url;
  },
};
