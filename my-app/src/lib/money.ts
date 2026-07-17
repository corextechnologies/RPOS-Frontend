/**
 * Money.
 *
 * Two representations exist in this app and they must never meet in one sum:
 *
 * - **Minor units** (`number`, integer). Every POS field ending `_minor`.
 *   `50000` is PKR 500.00. This is the only representation POS arithmetic
 *   ever uses.
 * - **Decimal strings** (`"500.00"`). The older Phase 5 / billing surfaces —
 *   `cost_price`, `selling_price`, `sales_records.amount`, invoices. Unchanged
 *   and staying that way.
 *
 * This module is the ONLY place the two convert. That is a convention, not
 * something the type system enforces, and the predictable bug it exists to
 * prevent is a total that is off by exactly 100x.
 *
 * `minorUnits` is a parameter, never a constant: it comes from the server's
 * pack (`bootstrap.pack.minor_units`). Hardcoding `/100` breaks the moment a
 * 0-minor-unit currency (JPY, KWD's 3) appears, and does it silently.
 */

/** An integer count of minor units. A branded alias — documentation, not enforcement. */
export type Minor = number;

export class MoneyError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

function assertInteger(minor: number, label = "amount"): void {
  if (!Number.isInteger(minor)) {
    throw new MoneyError(
      `${label} must be an integer number of minor units, got ${minor}. ` +
        `A fractional minor unit means a float leaked into money arithmetic.`,
    );
  }
  if (!Number.isSafeInteger(minor)) {
    throw new MoneyError(`${label} exceeds safe integer range: ${minor}`);
  }
}

function pow10(n: number): number {
  return 10 ** n;
}

/**
 * Parse a decimal string (`"500.00"`, `"500"`, `"-12.5"`) into minor units.
 *
 * Deliberately string-based: `Math.round(parseFloat("1.005") * 100)` is 100
 * on some inputs and 101 on others, and which one you get depends on values
 * you cannot see. Excess precision rounds half-up (away from zero).
 */
export function parseDecimalToMinor(
  value: string | number | null | undefined,
  minorUnits = 2,
): Minor {
  if (value === null || value === undefined || value === "") {
    throw new MoneyError("Cannot parse empty value as money");
  }
  const raw = (typeof value === "number" ? String(value) : value).trim();

  const match = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(raw);
  if (!match || (match[2] === "" && (match[3] ?? "") === "")) {
    throw new MoneyError(`Not a decimal amount: ${JSON.stringify(raw)}`);
  }

  const negative = match[1] === "-";
  const whole = match[2] || "0";
  const fracRaw = match[3] ?? "";

  // Pad to exactly minorUnits, keeping one extra digit to decide rounding.
  const frac = fracRaw.padEnd(minorUnits + 1, "0");
  const kept = frac.slice(0, minorUnits);
  const next = frac.charCodeAt(minorUnits) - 48; // first dropped digit

  let minor = Number(`${whole}${kept}`);
  if (!Number.isSafeInteger(minor)) {
    throw new MoneyError(`Amount too large to represent exactly: ${raw}`);
  }
  if (next >= 5) minor += 1; // half-up, away from zero

  return negative ? -minor : minor;
}

/**
 * Render minor units as a plain decimal string — no symbol, no grouping.
 * Exact at any magnitude; this is the inverse of `parseDecimalToMinor` and the
 * right thing to put in a form input or send to a decimal-string endpoint.
 */
export function minorToDecimalString(minor: Minor, minorUnits = 2): string {
  assertInteger(minor);
  if (minorUnits === 0) return String(minor);

  const negative = minor < 0;
  const digits = String(Math.abs(minor)).padStart(minorUnits + 1, "0");
  const whole = digits.slice(0, digits.length - minorUnits);
  const frac = digits.slice(digits.length - minorUnits);
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/**
 * Format minor units for display, with currency code and grouping.
 *
 * Uses `currencyDisplay: "code"` — "PKR 500.00", not "Rs500.00". Two reasons:
 * it matches the output the backend's wiring guide specifies, and "Rs" is
 * ambiguous across PKR, INR, LKR and NPR, which is not a property you want on
 * a fiscal receipt. (ICU's `en-PK` default really does render "Rs500.00" —
 * `money.test.ts` pins this so a future ICU update can't quietly change it.)
 *
 * The division here is the one float operation in this module and it is
 * display-only: exact for any amount below ~9e13 in a 2-minor-unit currency,
 * several orders of magnitude past a restaurant bill. Never feed the result
 * back into arithmetic — use `minorToDecimalString` for that.
 */
export function formatMinor(
  minor: Minor,
  currency = "PKR",
  minorUnits = 2,
  locale?: string,
): string {
  assertInteger(minor);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: minorUnits,
      maximumFractionDigits: minorUnits,
    }).format(minor / pow10(minorUnits));
  } catch {
    // Unknown currency code — don't blow up a receipt over a formatting nicety.
    return `${currency} ${minorToDecimalString(minor, minorUnits)}`;
  }
}

/** Sum. Integer-only; throws rather than silently truncating a float. */
export function sumMinor(amounts: readonly Minor[]): Minor {
  let total = 0;
  for (const a of amounts) {
    assertInteger(a);
    total += a;
  }
  assertInteger(total, "total");
  return total;
}

/** `qty` must be a whole count — there is no such thing as 1.5 burgers here. */
export function multiplyMinor(minor: Minor, qty: number): Minor {
  assertInteger(minor);
  if (!Number.isInteger(qty)) {
    throw new MoneyError(`Quantity must be a whole number, got ${qty}`);
  }
  const product = minor * qty;
  assertInteger(product, "product");
  return product;
}

/** Basis points: 5000 bp = 50%. Rounds half-up, matching the server. */
export function applyBasisPoints(minor: Minor, bp: number): Minor {
  assertInteger(minor);
  if (!Number.isInteger(bp)) {
    throw new MoneyError(`Basis points must be an integer, got ${bp}`);
  }
  const negative = minor < 0;
  const scaled = Math.abs(minor) * bp;
  const rounded = Math.round(scaled / 10000);
  return negative ? -rounded : rounded;
}

/** `5000` -> `"50%"`. Trims trailing zeros so 250bp reads "2.5%" not "2.50%". */
export function formatBasisPoints(bp: number): string {
  const pct = minorToDecimalString(bp, 2);
  return `${pct.replace(/\.?0+$/, "")}%`;
}
