import type { StaffProfileFields } from "@/lib/types/staff";

/**
 * The seven shared staff profile fields, ready to spread into a create body.
 *
 * Exists because each portal's `create*User` hand-wrote its own JSON body, and
 * when the field set grew from three to eight, three of the four mappings were
 * left behind — silently dropping `address` and both CNIC urls and earning a
 * 422 from the server. One builder means adding a field is a single edit, not
 * four edits and a bug.
 *
 * Values are trimmed but NOT dropped when blank: every one of these is required
 * on create, so sending `""` lets the server's validation report the empty
 * field, whereas omitting the key reports it as missing and is harder to act on.
 * (`optionalText` is still right for genuinely optional fields elsewhere.)
 */
export function staffProfileBody(input: StaffProfileFields) {
  return {
    full_name: input.full_name?.trim() ?? "",
    phone_number: input.phone_number?.trim() ?? "",
    address: input.address?.trim() ?? "",
    image_url: input.image_url ?? "",
    cnic_front_url: input.cnic_front_url ?? "",
    cnic_back_url: input.cnic_back_url ?? "",
  };
}
