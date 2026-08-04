"use client";

import { CornerDownRight } from "lucide-react";
import { Money } from "./Money";
import { cn } from "@/lib/utils";
import type { PosOrder, PosOrderLine } from "@/lib/types/pos";

/**
 * Order lines, rendered the way the wiring guide requires:
 *
 * > "Combos explode into child lines with `parent_line_id` set. **Render only
 * > `parent_line_id === null` lines as priced rows**; show the children beneath
 * > the header at zero."
 *
 * The reason that rule exists: a combo's children carry the components the
 * kitchen must make, but the *money* lives on the parent. Pricing the children
 * too would double the bill; hiding them would lose what's actually in the box.
 * So parents are priced rows and children are a zero-priced indented list.
 */
export function OrderLines({ order }: { order: PosOrder }) {
  const parents = order.lines.filter((l) => l.parent_line_id === null);
  const childrenOf = (parentId: number) =>
    order.lines.filter((l) => l.parent_line_id === parentId);

  return (
    <ul className="divide-y divide-line">
      {parents.map((line) => (
        <li key={line.id} className="py-2.5">
          <Row line={line} />
          {childrenOf(line.id).map((child) => (
            <Row key={child.id} line={child} child />
          ))}
        </li>
      ))}
    </ul>
  );
}

function Row({ line, child = false }: { line: PosOrderLine; child?: boolean }) {
  return (
    <div className={cn("flex items-start gap-2 text-sm", child && "mt-1.5 pl-5")}>
      {child && (
        <CornerDownRight className="mt-0.5 size-3 shrink-0 text-faint" aria-hidden />
      )}

      <span className={cn("shrink-0 tabular-nums", child ? "text-faint" : "text-muted")}>
        {line.quantity}×
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate", child ? "text-muted" : "text-content")}>
          {line.name}
          {!child && line.needs_prep && (
            <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted">
              Made to order
            </span>
          )}
        </p>
        {line.modifiers && line.modifiers.length > 0 && (
          <p className="truncate text-xs text-faint">
            {line.modifiers.map((m) => m.name).join(", ")}
          </p>
        )}
        {line.note && <p className="truncate text-xs italic text-faint">“{line.note}”</p>}
      </div>

      {/*
        Children show no money at all rather than a formatted zero. The guide
        says "at zero"; a literal "PKR 0.00" next to a bun reads like the bun
        was free, which is a different claim from "it's part of the combo".
      */}
      {child ? (
        <span className="shrink-0 text-xs text-faint">included</span>
      ) : (
        <Money minor={line.line_total_minor} className="shrink-0 text-content" />
      )}
    </div>
  );
}
