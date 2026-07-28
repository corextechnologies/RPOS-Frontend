/**
 * Staff & manager profile fields shared by all four portals.
 *
 * Branch, Kitchen, Warehouse and Admin all collect the same eight fields when
 * creating a person; only field 6 differs (see `StaffRoleField` below). These
 * live here rather than being copied into four DTO files so the set cannot
 * drift portal by portal.
 */

/**
 * How the server should process an uploaded image.
 *
 * `personal` is resized to 400px (a profile photo); `cnic` to 1600px at higher
 * quality, because an ID number is unreadable at avatar size. Anything else is
 * rejected with 409 `invalid_document_kind`.
 */
export type StaffDocumentKind = "personal" | "cnic";

/**
 * The seven portal-agnostic profile fields. Field 6 (role / position / job
 * title) is deliberately absent — it is typed differently per portal and each
 * `Create*Input` adds its own.
 *
 * All are REQUIRED on create (a partial body is a 422). They stay optional in
 * this shape because PATCH is partial: an omitted field means "unchanged", so
 * edit sends only what actually changed.
 */
export interface StaffProfileFields {
  full_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  /** Signed, EXPIRING URL from `uploadStaffDocument(file, "personal")`. */
  image_url?: string;
  /** Signed, EXPIRING URL from `uploadStaffDocument(file, "cnic")`. */
  cnic_front_url?: string;
  /** Signed, EXPIRING URL from `uploadStaffDocument(file, "cnic")`. */
  cnic_back_url?: string;
}

/**
 * The same fields as they come back on a staff record. Nullable rather than
 * optional: the server returns the key with `null` when unset.
 *
 * ⚠️ The three image URLs are SIGNED and EXPIRE ~15 minutes after the response
 * was generated. Do not cache them in localStorage or a long-lived store, and
 * do not hold a list open indefinitely — re-fetch the record instead. Menu
 * photos and the restaurant logo are permanent public URLs; these are not.
 */
export interface StaffProfileRecord {
  phone_number?: string | null;
  address?: string | null;
  image_url?: string | null;
  cnic_front_url?: string | null;
  cnic_back_url?: string | null;
}

/**
 * How long a staff query may serve cached data.
 *
 * Comfortably inside the ~15-minute signing window, so a screen left open does
 * not end up rendering three dead image links per person. Pair with
 * `refetchOnWindowFocus` — coming back to a tab after lunch is exactly the case
 * that breaks otherwise.
 */
export const STAFF_STALE_TIME_MS = 5 * 60 * 1000;
