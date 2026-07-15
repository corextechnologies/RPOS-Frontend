/**
 * Wire-normalisation helpers shared by the domain API modules.
 *
 * These started out private to warehouse.api.ts. The Kitchen portal needs the
 * same three, and a third copy is one too many — the rules they encode (ids are
 * strings, blank optional text is omitted, meta falls back to what we asked for)
 * are properties of the backend, not of any one portal.
 */

/**
 * Optional string fields are dropped when blank rather than sent as "".
 * The stock endpoints reject empty-but-present values (`notes` must be at least
 * one character if included), so an omitted key is the only safe encoding.
 */
export function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Backend ids are numeric and nullable; the app keys off strings everywhere. */
export function idOrNull(value: unknown): string | null {
  return value == null ? null : String(value);
}

/** Falls back to the value we requested when the envelope's meta omits the key. */
export function numberFromMeta(
  meta: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  return typeof meta?.[key] === "number" ? (meta[key] as number) : fallback;
}
