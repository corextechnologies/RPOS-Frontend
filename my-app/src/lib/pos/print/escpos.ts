/**
 * A minimal ESC/POS command builder for thermal receipt printers.
 *
 * ESC/POS is the near-universal command language of 58 mm / 80 mm thermal
 * printers: a stream of bytes interleaving control codes (`ESC @` to reset,
 * `GS V` to cut, `ESC a` to align) with the text to print. The backend never
 * speaks it — rendering the ticket is the client's job (§11) — so this is where
 * it lives.
 *
 * The output is a `Uint8Array` the shell pushes to the printer over its
 * transport (`DeviceServices.print`): raw TCP `:9100` on the counter, Bluetooth
 * on the tablet. This builder is transport-agnostic and pure — it produces the
 * same bytes everywhere, which is what lets the same renderer serve online and
 * offline (§11).
 *
 * Text is encoded UTF-8. That covers ASCII and Latin cleanly; a codepage switch
 * for Urdu/Arabic glyphs is a later concern and is called out where it bites.
 */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export type Align = "left" | "center" | "right";

const ALIGN_CODE: Record<Align, number> = { left: 0, center: 1, right: 2 };

/**
 * Accumulates ESC/POS bytes through a small chainable API. Not a general
 * ESC/POS library — just the handful of commands a food ticket and a receipt
 * actually use, so there is no unused surface to get wrong.
 */
export class EscPosBuilder {
  private readonly chunks: Uint8Array[] = [];
  private readonly encoder = new TextEncoder();

  /** `ESC @` — reset the printer to a known state. Start every ticket with this. */
  init(): this {
    return this.raw(ESC, 0x40);
  }

  raw(...bytes: number[]): this {
    this.chunks.push(Uint8Array.from(bytes));
    return this;
  }

  /** Append text with no trailing newline. */
  text(value: string): this {
    this.chunks.push(this.encoder.encode(value));
    return this;
  }

  /** Append text followed by a line feed. */
  line(value = ""): this {
    return this.text(value).raw(LF);
  }

  /** `ESC a n` — left / center / right for subsequent lines. */
  align(a: Align): this {
    return this.raw(ESC, 0x61, ALIGN_CODE[a]);
  }

  /** `ESC E n` — emphasis (bold) on/off. */
  bold(on: boolean): this {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }

  /**
   * `GS ! n` — character size. `width`/`height` are 1–8 multipliers; the low
   * nibble is height, the high nibble width, so a double-size line is `0x11`.
   */
  size(width: number, height: number): this {
    const w = clampMultiplier(width);
    const h = clampMultiplier(height);
    return this.raw(GS, 0x21, ((w - 1) << 4) | (h - 1));
  }

  /** Back to 1× text after a {@link size} call. */
  normal(): this {
    return this.size(1, 1);
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.raw(LF);
    return this;
  }

  /** `GS V` — full cut. Feeds a little first so the cut clears the last line. */
  cut(): this {
    return this.feed(3).raw(GS, 0x56, 0x00);
  }

  /**
   * `ESC p` — pulse the cash drawer kick connected to the printer. Counter
   * receipt printers drive the drawer this way; a no-op on a printer with none.
   */
  openDrawer(): this {
    return this.raw(ESC, 0x70, 0x00, 0x19, 0xfa);
  }

  build(): Uint8Array {
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }
}

function clampMultiplier(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(8, Math.max(1, Math.floor(n)));
}

/**
 * A left-label / right-value row padded to the paper width — the workhorse of a
 * receipt's money column. `width` is the printer's character columns (32 for
 * 58 mm, 48 for 80 mm at Font A). Truncates the label rather than wrap so the
 * value never gets pushed off the paper.
 */
export function twoColumns(label: string, value: string, width = 32): string {
  const gap = width - value.length;
  if (gap <= 1) return `${label} ${value}`.slice(0, width);
  const left = label.length > gap - 1 ? label.slice(0, gap - 1) : label;
  return left.padEnd(gap, " ") + value;
}
