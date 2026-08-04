"use client";

import { useState } from "react";
import { Minus, PackageOpen, Plus, Trash2, Car, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Money } from "./Money";
import { CustomerDialog } from "./CustomerDialog";
import { useCart, lineTotalMinor } from "@/lib/pos/cart";
import { cn } from "@/lib/utils";
import { usePosBootstrap, usePosSession } from "@/lib/pos/pos-session";
import type { PosCustomer } from "@/lib/types/pos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderType } from "@/lib/types/pos";

const ORDER_TYPES: OrderType[] = ["TAKEAWAY", "DINE_IN", "CURBSIDE", "DELIVERY", "PICKUP"];

function label(v: string) {
  return v.toLowerCase().replace(/_/g, " ");
}

export function CartPanel({
  onSend,
  onPark,
  onRecall,
  busy,
  canCreate,
  parkedCount = 0,
}: {
  onSend: () => void;
  onPark: () => void;
  onRecall: () => void;
  busy?: boolean;
  canCreate: boolean;
  parkedCount?: number;
}) {
  const { cart, subtotalMinor, itemCount, setQty, remove, setNote, setNeedsPrep, patch } = useCart();
  const { device } = usePosBootstrap();
  const { can } = usePosSession();

  const [customerOpen, setCustomerOpen] = useState(false);
  // The picked customer's display name is client-only — the cart carries the id
  // (that's what the server wants), and re-fetching a name we already had would
  // be a round trip for nothing.
  const [customer, setCustomer] = useState<PosCustomer | null>(null);

  // Curbside is the device's whole reason for existing, so a curbside terminal
  // defaults to it rather than making the operator pick it every single order.
  const isCurbside = cart.order_type === "CURBSIDE" || device.profile === "CURBSIDE";

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-surface">
      <div className="flex gap-2 border-b border-line p-3">
        <Select
          value={cart.order_type}
          onValueChange={(v) => patch({ order_type: v as OrderType })}
        >
          <SelectTrigger className="h-11 flex-1 capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {label(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="h-11 shrink-0 px-3"
          onClick={onRecall}
          disabled={busy}
        >
          <PackageOpen className="size-4" aria-hidden />
          {parkedCount > 0 && <span className="ml-1.5 tabular-nums">{parkedCount}</span>}
          <span className="sr-only">Recall a parked order</span>
        </Button>
      </div>

      {/* A recalled order is the SAME order — saying so stops a cashier
          wondering why the total already has a discount on it. */}
      {cart.order_id !== null && (
        <p className="border-b border-line bg-accent/10 px-3 py-1.5 text-xs text-accent">
          Recalled order — sending updates it rather than creating a new one.
        </p>
      )}

      {(can("CUSTOMER_READ") || can("CUSTOMER_CREATE")) && (
        <button
          type="button"
          onClick={() => setCustomerOpen(true)}
          className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-left text-sm hover:bg-surface-2"
        >
          <UserRound className="size-4 shrink-0 text-faint" aria-hidden />
          {customer ? (
            <>
              <span className="min-w-0 flex-1 truncate text-content">{customer.name}</span>
              <span
                role="button"
                tabIndex={0}
                className="shrink-0 text-xs text-faint hover:text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomer(null);
                  patch({ customer_id: null });
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.stopPropagation();
                  setCustomer(null);
                  patch({ customer_id: null });
                }}
              >
                Remove
              </span>
            </>
          ) : (
            <span className="flex-1 text-muted">Add a customer</span>
          )}
        </button>
      )}

      {isCurbside && (
        <div className="space-y-2 border-b border-line bg-surface-2 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Car className="size-3.5" aria-hidden />
            {/* The KOT carries these so the runner can match food to a car —
                they're the only reason the kitchen ticket has them. */}
            Car details — printed on the kitchen ticket
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Plate"
              className="h-10"
              value={cart.vehicle_plate}
              onChange={(e) => patch({ vehicle_plate: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="Colour"
              className="h-10"
              value={cart.vehicle_colour}
              onChange={(e) => patch({ vehicle_colour: e.target.value })}
            />
          </div>
          <Input
            placeholder="Bay no."
            className="h-10"
            value={cart.bay_no}
            onChange={(e) => patch({ bay_no: e.target.value })}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {cart.lines.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Tap items to start an order.</p>
        ) : (
          <ul className="divide-y divide-line">
            {cart.lines.map((line) => (
              <li key={line.uid} className="p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-content">
                      <span className="min-w-0 truncate">{line.name}</span>
                      {line.needs_prep && (
                        <Badge variant="warning" className="shrink-0">
                          Prep
                        </Badge>
                      )}
                    </p>
                    {line.modifier_labels.length > 0 && (
                      <p className="text-xs text-muted">{line.modifier_labels.join(", ")}</p>
                    )}
                  </div>
                  <Money minor={lineTotalMinor(line)} className="text-sm text-content" />
                  <button
                    type="button"
                    onClick={() => remove(line.uid)}
                    className="text-faint hover:text-danger"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => setQty(line.uid, line.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    onClick={() => setQty(line.uid, line.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </Button>

                  {!line.is_combo && (
                    <button
                      type="button"
                      onClick={() => setNeedsPrep(line.uid, !line.needs_prep)}
                      aria-pressed={!!line.needs_prep}
                      className={cn(
                        "ml-auto rounded px-2 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
                        line.needs_prep
                          ? "bg-accent/15 text-accent"
                          : "bg-surface-2 text-faint hover:text-muted",
                      )}
                    >
                      Made to order
                    </button>
                  )}
                </div>

                {/* Note doubles as the chef's instruction on a prep line. Shown
                    once flagged or whenever a note already exists, so it's
                    editable without forcing a field onto every plain sale. */}
                {(line.needs_prep || line.note) && (
                  <Input
                    className="mt-2 h-9 text-sm"
                    placeholder={
                      line.needs_prep ? "Happy Birthday Ali, no onions…" : "Note for the kitchen…"
                    }
                    value={line.note ?? ""}
                    onChange={(e) => setNote(line.uid, e.target.value)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-line p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">
            Subtotal
            {/* Not "Total". Tax is the server's and, under the PK pack, isn't
                even knowable until the tender is chosen. Calling this a total
                would be a promise this screen can't keep. */}
          </span>
          <Money minor={subtotalMinor} emphasis className="text-xl" />
        </div>
        <p className="text-xs text-faint">Tax is calculated at payment.</p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12"
            disabled={!itemCount || busy}
            onClick={onPark}
          >
            Park
          </Button>
          <Button
            className="h-12 text-base"
            disabled={!itemCount || busy || !canCreate}
            onClick={onSend}
          >
            Send
          </Button>
        </div>
      </div>

      <CustomerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onPick={(picked) => {
          setCustomer(picked);
          patch({
            customer_id: picked?.id ?? null,
            // Curbside carries the car on the KOT so the runner can match food
            // to a vehicle. If the customer record already knows it, don't make
            // the cashier retype it.
            ...(picked?.vehicle_plate ? { vehicle_plate: picked.vehicle_plate } : {}),
            ...(picked?.vehicle_colour ? { vehicle_colour: picked.vehicle_colour } : {}),
          });
        }}
      />
    </aside>
  );
}
