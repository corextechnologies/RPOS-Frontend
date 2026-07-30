/**
 * A self-contained ESC/POS test ticket for printer bring-up.
 *
 * The point is to prove the whole path — app → native socket → printer → paper —
 * in isolation from menus, orders, and config. If this prints, the transport
 * works and any later "it didn't print" is a routing/config problem, not a
 * hardware or socket one.
 */

import { EscPosBuilder, twoColumns } from "./escpos";

/**
 * @param stamp  An ISO timestamp to print (passed in, not read from the clock,
 *               so the caller controls it and this stays pure/testable).
 */
export function buildTestTicket(stamp: string): Uint8Array {
  return new EscPosBuilder()
    .init()
    .align("center")
    .bold(true)
    .size(2, 2)
    .line("RPOS")
    .size(1, 1)
    .line("Printer test")
    .bold(false)
    .align("left")
    .line("-".repeat(32))
    .line(twoColumns("Status", "OK", 32))
    .line(twoColumns("Time", stamp, 32))
    .line("-".repeat(32))
    .align("center")
    .line("If you can read this,")
    .line("printing works.")
    .cut()
    .build();
}
