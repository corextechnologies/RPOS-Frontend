"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ImagePlus,
  Layers,
  Lock,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { usePublishedMenu, useSellableProducts } from "@/lib/hooks/use-pos-admin";
import { imageUploadErrorMessage, posErrorMessage } from "@/lib/api/errors";
import { minorToDecimalString } from "@/lib/money";
import {
  draftFromMenu,
  publishDraft,
  validateDraft,
  type DraftGroup,
  type DraftItem,
  type MenuDraft,
} from "@/lib/pos/menu-draft";
import { useQueryClient } from "@tanstack/react-query";
import type { SellableProduct } from "@/lib/types/pos";
import { cn } from "@/lib/utils";
import { apiConfig } from "@/lib/api/config";
import { toast } from "sonner";

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return `${apiConfig.baseUrl.replace(/\/v1$/, "")}${url}`;
  return url;
}

const tempId = () => `t${Date.now()}${Math.round(performance.now() * 1000)}`;

/**
 * Menu authoring.
 *
 * The model to hold onto: a **published version is immutable**. You don't edit
 * the live menu — you compose a new version and publish it, and the old one
 * stays readable forever so a receipt from last month reprints at last month's
 * prices. Editing a published version earns 409 `menu_version_immutable`.
 *
 * So this screen is: look at what's live → stage a whole version → publish.
 * There is deliberately no "edit" button on the live menu, because there is no
 * such operation. The sequencing (groups → components → combos → publish) lives
 * in `menu-draft.ts`, tested, rather than in this component.
 */
export default function AdminMenuPage() {
  const live = usePublishedMenu();
  // NOT the product-pricing list: that returns the whole catalogue, raw
  // materials included. This endpoint is FINISHED_GOOD + RESALE by construction.
  const products = useSellableProducts();
  const qc = useQueryClient();

  const [draft, setDraft] = useState<MenuDraft>({ groups: [], items: [] });
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // tempId of the draft item currently open in the edit dialog.
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  // A blank item being composed in the add dialog (null = closed).
  const [addingItem, setAddingItem] = useState<DraftItem | null>(null);
  // Live item pending delete-confirmation (null = no prompt).
  const [deletingItem, setDeletingItem] = useState<{ id: number; name: string } | null>(null);

  const errors = draft.items.length ? validateDraft(draft) : [];
  const canPublish = draft.items.length > 0 && errors.length === 0;
  const editingItem = editingTempId
    ? (draft.items.find((i) => i.tempId === editingTempId) ?? null)
    : null;

  // The draft starts as a copy of the live menu, so adding/editing/removing an
  // item and publishing updates the live menu instead of replacing it with just
  // the staged item. Seed once per published version while the draft is empty
  // (initial load, and after a publish resets it to the new live menu). Adjusting
  // state during render — guarded against a loop — is the React-blessed way to
  // derive state from changing props without an effect.
  const [seededVersion, setSeededVersion] = useState<number | null>(null);
  const liveVersion = live.data?.menu_version_id ?? null;
  if (
    liveVersion != null &&
    seededVersion !== liveVersion &&
    draft.items.length === 0 &&
    draft.groups.length === 0
  ) {
    setSeededVersion(liveVersion);
    if (live.data && live.data.items.length > 0) {
      setDraft(draftFromMenu(live.data));
    }
  }

  /**
   * Apply the edit in place, then publish straight away so the change lands on
   * the live menu. Because editLiveItem seeds the whole live menu into the draft
   * first, publishing this draft is "the live menu with just this edit". On
   * failure the edit stays staged so it can be retried from the Publish button.
   */
  async function saveEditedItem(updated: DraftItem) {
    const nextDraft: MenuDraft = {
      ...draft,
      items: draft.items.map((i) => (i.tempId === updated.tempId ? updated : i)),
    };
    setDraft(nextDraft);
    setPublishing(true);
    try {
      await publishDraft(nextDraft, posAdminApi);
      setDraft({ groups: [], items: [] });
      qc.invalidateQueries({ queryKey: ["pos-admin-menu"] });
      setEditingTempId(null);
      toast.success("Saved — the live menu is updated.");
    } catch (err) {
      toast.error(posErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  /** Open the add-item dialog with a fresh blank (non-combo) item. */
  function openAddItem() {
    setAddingItem({
      tempId: tempId(),
      name: "",
      price: "",
      product_id: null,
      is_combo: false,
      componentTempIds: [],
      groupTempIds: [],
    });
  }

  /**
   * Append a new item and publish. The draft already holds the live menu (it is
   * seeded on load), so publishing lands the new item on top of the current menu
   * rather than replacing it.
   */
  async function saveNewItem(newItem: DraftItem) {
    const nextDraft: MenuDraft = { ...draft, items: [...draft.items, newItem] };
    setDraft(nextDraft);
    setPublishing(true);
    try {
      await publishDraft(nextDraft, posAdminApi);
      setDraft({ groups: [], items: [] });
      qc.invalidateQueries({ queryKey: ["pos-admin-menu"] });
      setAddingItem(null);
      toast.success("Added — the live menu is updated.");
    } catch (err) {
      toast.error(posErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  /**
   * Remove a live item and publish. The draft holds the whole live menu (seeded
   * on load), so publishing it without this item drops just that one. Guards the
   * last-item case via the normal publish validation.
   */
  async function confirmDeleteLiveItem() {
    if (!deletingItem || !live.data) return;
    const tempId = `item-${deletingItem.id}`;
    const base = draft.items.some((i) => i.tempId.startsWith("item-"))
      ? draft
      : draftFromMenu(live.data);
    const nextDraft: MenuDraft = {
      ...base,
      items: base.items.filter((i) => i.tempId !== tempId),
    };
    setDraft(nextDraft);
    setPublishing(true);
    try {
      await publishDraft(nextDraft, posAdminApi);
      setDraft({ groups: [], items: [] });
      qc.invalidateQueries({ queryKey: ["pos-admin-menu"] });
      setDeletingItem(null);
      toast.success("Removed — the live menu is updated.");
    } catch (err) {
      toast.error(posErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  /**
   * Edit a live (published) item. Publishing replaces the whole menu with the
   * draft, so the draft must hold the entire live menu first — otherwise the
   * rest of the menu would be dropped. Seed it once (keeping any custom staged
   * items), then open the dialog on that item's draft counterpart.
   */
  function editLiveItem(itemId: number) {
    if (!live.data) return;
    const tempId = `item-${itemId}`;
    if (draft.items.some((i) => i.tempId === tempId)) {
      setEditingTempId(tempId);
      return;
    }
    const seeded = draftFromMenu(live.data);
    const customItems = draft.items.filter((i) => !i.tempId.startsWith("item-"));
    const customGroups = draft.groups.filter((g) => !g.tempId.startsWith("group-"));
    setDraft({
      groups: [...seeded.groups, ...customGroups],
      items: [...seeded.items, ...customItems],
    });
    setEditingTempId(tempId);
  }

  async function publish() {
    setPublishing(true);
    try {
      await publishDraft(draft, posAdminApi);
      setDraft({ groups: [], items: [] });
      qc.invalidateQueries({ queryKey: ["pos-admin-menu"] });
      toast.success("Menu published — tills pick it up on their next sync.");
    } catch (err) {
      // A failure here leaves the version created but UNPUBLISHED, so no till
      // ever sees a half-built menu. The draft stays staged so it can be fixed
      // and re-published rather than retyped.
      toast.error(posErrorMessage(err));
    } finally {
      setPublishing(false);
      setConfirmPublish(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">Menu</h1>
        <p className="mt-1 text-sm text-muted">
          What the tills sell. Published versions can&apos;t be edited — publish a new one to
          change anything.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LiveMenu
          live={live}
          onEditItem={editLiveItem}
          onAddItem={openAddItem}
          onDeleteItem={setDeletingItem}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next version</CardTitle>
              <CardDescription>
                Starts as a copy of the live menu. Add, edit, or remove items, then publish to
                update the whole menu at once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <GroupBuilder
                groups={draft.groups}
                onChange={(groups) => setDraft((d) => ({ ...d, groups }))}
              />

              <ItemBuilder
                draft={draft}
                products={products.data ?? []}
                onChange={(items) => setDraft((d) => ({ ...d, items }))}
              />

              {errors.length > 0 && (
                <ul className="space-y-1 rounded-xl border border-warning/40 bg-warning/10 p-3">
                  {errors.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-xs text-warning">
                      <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {e}
                    </li>
                  ))}
                </ul>
              )}

              <Button
                className="w-full"
                disabled={!canPublish || publishing}
                onClick={() => setConfirmPublish(true)}
              >
                <Send className="mr-1.5 size-4" aria-hidden />
                Publish {draft.items.length > 0 && `${draft.items.length} item(s)`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish this menu?"
        description="Every till picks it up on its next sync. A published version can't be edited — changing anything later means publishing again."
        confirmLabel="Publish"
        loading={publishing}
        onConfirm={publish}
      />

      {editingItem && (
        <ItemEditDialog
          item={editingItem}
          mode="edit"
          products={products.data ?? []}
          saving={publishing}
          onSave={saveEditedItem}
          onClose={() => setEditingTempId(null)}
        />
      )}

      {addingItem && (
        <ItemEditDialog
          item={addingItem}
          mode="add"
          products={products.data ?? []}
          saving={publishing}
          onSave={saveNewItem}
          onClose={() => setAddingItem(null)}
        />
      )}

      <ConfirmDialog
        open={deletingItem !== null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title={deletingItem ? `Remove "${deletingItem.name}"?` : "Remove item?"}
        description="This publishes a new version of the live menu without this item."
        confirmLabel="Remove"
        loading={publishing}
        onConfirm={confirmDeleteLiveItem}
      />
    </div>
  );
}

function LiveMenu({
  live,
  onEditItem,
  onAddItem,
  onDeleteItem,
}: {
  live: ReturnType<typeof usePublishedMenu>;
  onEditItem: (itemId: number) => void;
  onAddItem: () => void;
  onDeleteItem: (item: { id: number; name: string }) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              Live menu
              <Lock className="size-3.5 text-faint" aria-label="Immutable" />
            </CardTitle>
            <CardDescription>
              {live.data
                ? `Version ${live.data.menu_version_id} · ${live.data.items.length} item(s)`
                : "Nothing published yet"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={onAddItem}>
            <Plus className="mr-1.5 size-3.5" aria-hidden />
            Add item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {live.isLoading ? (
          <p className="p-6 text-center text-sm text-muted">Loading…</p>
        ) : live.error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-danger">{posErrorMessage(live.error)}</p>
            {/* If this 403s with device_not_bound, authoring wants a device
                token after all — the one assumption in pos-admin.api.ts. */}
            <p className="mt-1 text-xs text-faint">
              If this says the device isn&apos;t bound, the backend needs to confirm which token
              authoring takes.
            </p>
          </div>
        ) : !live.data?.items.length ? (
          <p className="p-6 text-center text-sm text-muted">
            No menu published. Stage items and publish to go live.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {live.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {resolveImageUrl(item.image_url) ? (
                      <img
                        src={resolveImageUrl(item.image_url)!}
                        alt={item.name}
                        className="size-10 rounded-lg border border-line object-cover"
                      />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-lg border border-line bg-surface-2">
                        <ImagePlus className="size-4 text-faint" aria-hidden />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-content">{item.name}</span>
                    {item.is_combo && (
                      <Layers className="ml-1.5 inline size-3 text-accent" aria-label="Combo" />
                    )}
                    {item.modifier_groups.length > 0 && (
                      <span className="ml-1.5 text-xs text-faint">
                        {item.modifier_groups.length} option group(s)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted">{item.category ?? "-"}</TableCell>
                  <TableCell className="text-right tabular-nums text-content">
                    {minorToDecimalString(item.price_minor)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEditItem(item.id)}
                        className="text-faint transition hover:text-brand"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem({ id: item.id, name: item.name })}
                        className="text-faint transition hover:text-danger"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function GroupBuilder({
  groups,
  onChange,
}: {
  groups: DraftGroup[];
  onChange: (groups: DraftGroup[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [min, setMin] = useState("0");
  const [max, setMax] = useState("1");
  const [options, setOptions] = useState<Array<{ name: string; price_delta: string }>>([
    { name: "", price_delta: "0" },
  ]);

  function add() {
    const usable = options.filter((o) => o.name.trim());
    if (!name.trim() || !usable.length) {
      toast.error("A group needs a name and at least one option");
      return;
    }
    onChange([
      ...groups,
      {
        tempId: tempId(),
        name: name.trim(),
        min_select: Number(min) || 0,
        max_select: Number(max) || 0,
        options: usable,
      },
    ]);
    setName("");
    setMin("0");
    setMax("1");
    setOptions([{ name: "", price_delta: "0" }]);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wide text-faint">Option groups</Label>
        <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
          <Plus className="mr-1 size-3.5" aria-hidden />
          Group
        </Button>
      </div>

      {groups.length > 0 && (
        <ul className="space-y-1">
          {groups.map((g) => (
            <li
              key={g.tempId}
              className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-content">{g.name}</span>
              <span className="shrink-0 text-xs text-faint">
                {g.options.length} option(s) ·{" "}
                {g.min_select > 0 ? `pick ${g.min_select}` : "optional"}
                {g.max_select > 0 && `–${g.max_select}`}
              </span>
              <button
                type="button"
                className="text-faint hover:text-danger"
                onClick={() => onChange(groups.filter((x) => x.tempId !== g.tempId))}
                aria-label={`Remove ${g.name}`}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="space-y-3 rounded-xl border border-line p-3">
          <Input
            className="h-9"
            placeholder="Group name — Extras, Sauce…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-faint">Min choices</Label>
              <Input
                className="h-9"
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value.replace(/\D/g, "") || "0")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-faint">Max (0 = any)</Label>
              <Input
                className="h-9"
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value.replace(/\D/g, "") || "0")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className="h-9 flex-1"
                  placeholder="Option name"
                  value={o.name}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="h-9 w-24"
                  inputMode="decimal"
                  placeholder="+0.00"
                  value={o.price_delta}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((x, idx) =>
                        idx === i ? { ...x, price_delta: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOptions((prev) => [...prev, { name: "", price_delta: "0" }])}
            >
              <Plus className="mr-1 size-3" aria-hidden />
              Option
            </Button>
          </div>

          <Button size="sm" className="w-full" onClick={add}>
            Add group
          </Button>
        </div>
      )}
    </div>
  );
}

/** Label for a catalogue row, e.g. "Coke (resale) — 210.00". */
function productLabel(p: SellableProduct): string {
  const kind = p.kind === "RESALE" ? " (resale)" : "";
  const price = p.selling_price ? ` — ${p.selling_price}` : " — not priced";
  return `${p.name}${kind}${price}`;
}

/**
 * Searchable catalogue picker — a button that opens a panel with a search box
 * and a filtered list. Replaces a native <select> so products can be filtered
 * as the list grows. `valueId` is "" for a custom (unlinked) item.
 */
function ProductPicker({
  products,
  valueId,
  onPick,
}: {
  products: SellableProduct[];
  valueId: string;
  onPick: (product: SellableProduct | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = products.find((p) => String(p.id) === valueId) ?? null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q),
      )
    : products;

  function choose(product: SellableProduct | null) {
    onPick(product);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 text-sm text-content"
      >
        <span className="truncate">{selected ? productLabel(selected) : "Custom item…"}</span>
        <ChevronDown className="size-4 shrink-0 text-faint" aria-hidden />
      </button>

      {open && (
        <>
          {/* Click-away layer. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
            <div className="border-b border-line p-2">
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2">
                <Search className="size-3.5 shrink-0 text-faint" aria-hidden />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products…"
                  className="h-8 w-full bg-transparent text-sm text-content outline-none placeholder:text-faint"
                />
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto p-1">
              <li>
                <button
                  type="button"
                  onClick={() => choose(null)}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-muted transition hover:bg-surface-2"
                >
                  Custom item…
                </button>
              </li>
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-surface-2 ${
                      String(p.id) === valueId ? "text-brand" : "text-content"
                    }`}
                  >
                    {productLabel(p)}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-2.5 py-2 text-sm text-faint">No products match.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ItemBuilder({
  draft,
  products,
  onChange,
}: {
  draft: MenuDraft;
  products: SellableProduct[];
  onChange: (items: DraftItem[]) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productId, setProductId] = useState("");
  const [isCombo, setIsCombo] = useState(false);
  const [componentTempIds, setComponentTempIds] = useState<string[]>([]);
  const [groupTempIds, setGroupTempIds] = useState<string[]>([]);

  /**
   * Picking a product prefills from the catalogue — the selling price already
   * lives there, and retyping it is how the menu and the catalogue drift apart.
   * `product_id` also links the item to stock, which is what makes 86-ing and
   * recipe deduction work.
   */
  function pick(id: string) {
    setProductId(id);
    const p = products.find((x) => String(x.id) === id);
    if (!p) return;
    setName(p.name);
    if (p.selling_price) setPrice(p.selling_price);
    if (p.category) setCategory(p.category);
  }

  const picked = products.find((x) => String(x.id) === productId);

  function add() {
    if (!name.trim() || !/^\d+(\.\d{1,2})?$/.test(price)) {
      toast.error("An item needs a name and a price like 250.00");
      return;
    }
    onChange([
      ...draft.items,
      {
        tempId: tempId(),
        name: name.trim(),
        price,
        // A combo holds no stock of its own, so it is never product-linked.
        product_id: isCombo ? null : productId ? Number(productId) : null,
        category: category.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        description: description.trim() || undefined,
        calories: calories.trim() ? Number(calories) : null,
        prep_time_minutes: prepTime.trim() ? Number(prepTime) : null,
        is_combo: isCombo,
        componentTempIds: isCombo ? componentTempIds : [],
        groupTempIds,
      },
    ]);
    setName("");
    setPrice("");
    setCategory("");
    setDescription("");
    setCalories("");
    setPrepTime("");
    setImageUrl("");
    setProductId("");
    setIsCombo(false);
    setComponentTempIds([]);
    setGroupTempIds([]);
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs uppercase tracking-wide text-faint">Add item</Label>

      <div className="space-y-3 rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
          <div>
            <Label className="text-sm">Combo</Label>
            <p className="text-xs text-faint">Made of other items on this menu.</p>
          </div>
          <Switch checked={isCombo} onCheckedChange={setIsCombo} />
        </div>

        {!isCombo && (
          <div className="space-y-1.5">
            <Label className="text-xs">From the catalogue</Label>
            <ProductPicker
              products={products}
              valueId={productId}
              onPick={(p) => pick(p ? String(p.id) : "")}
            />

            {/*
              A finished good with no recipe can go on a menu, but the kitchen
              cannot actually make it. Better Admin chases the kitchen now than
              discovers it mid-service.
            */}
            {picked?.kind === "FINISHED_GOOD" && !picked.has_recipe && (
              <p className="flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
                <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                No recipe yet — the kitchen can&apos;t make this. It can still go on the menu,
                but ask them to add one.
              </p>
            )}

            {picked?.kind === "RESALE" && (
              <p className="text-xs text-faint">
                Bought and sold as-is, so it needs no recipe.
              </p>
            )}

            {productId && (
              <p className="text-xs text-faint">
                Linked to stock, so 86-ing works for this item.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="menu-name">
              Name
            </Label>
            <Input
              id="menu-name"
              className="h-9"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="menu-price">
              Price
            </Label>
            <Input
              id="menu-price"
              className="h-9"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="menu-category">
            Category
          </Label>
          <Input
            id="menu-category"
            className="h-9"
            placeholder="Mains"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="menu-description">
            Description <span className="text-faint">(optional)</span>
          </Label>
          <Textarea
            id="menu-description"
            rows={3}
            placeholder="A wonderful dish prepared with the finest ingredients…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-faint">Shown on the public QR menu item detail.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="menu-calories">
              Calories <span className="text-faint">(optional)</span>
            </Label>
            <Input
              id="menu-calories"
              className="h-9"
              inputMode="numeric"
              placeholder="580"
              value={calories}
              onChange={(e) => setCalories(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="menu-prep-time">
              Prep time <span className="text-faint">(optional)</span>
            </Label>
            <Input
              id="menu-prep-time"
              className="h-9"
              inputMode="numeric"
              placeholder="25"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Product image</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              if (file.size > 10 * 1024 * 1024) {
                toast.error("Image must be under 10 MB");
                return;
              }
              setUploading(true);
              try {
                const url = await posAdminApi.uploadMenuImage(file);
                setImageUrl(url);
              } catch (err) {
                toast.error(imageUploadErrorMessage(err));
              } finally {
                setUploading(false);
              }
            }}
          />
          {imageUrl ? (
            <div className="relative inline-block">
              <img
                src={imageUrl}
                alt="Preview"
                className="h-20 w-20 rounded-xl border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-white shadow-soft"
                aria-label="Remove image"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-2 text-sm text-muted transition hover:border-brand/50 hover:text-content disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-brand" />
                  Uploading…
                </>
              ) : (
                <>
                  <ImagePlus className="size-4" />
                  Upload image
                </>
              )}
            </button>
          )}
        </div>

        {isCombo && (
          <div className="space-y-1.5">
            <Label className="text-xs">Contains</Label>
            {draft.items.length === 0 ? (
              <p className="text-xs text-faint">Stage the components first.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {draft.items.map((candidate) => (
                  <Toggle
                    key={candidate.tempId}
                    on={componentTempIds.includes(candidate.tempId)}
                    onClick={() =>
                      setComponentTempIds((prev) =>
                        prev.includes(candidate.tempId)
                          ? prev.filter((x) => x !== candidate.tempId)
                          : [...prev, candidate.tempId],
                      )
                    }
                  >
                    {candidate.name}
                  </Toggle>
                ))}
              </div>
            )}
          </div>
        )}

        {draft.groups.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Option groups</Label>
            <div className="flex flex-wrap gap-1.5">
              {draft.groups.map((g) => (
                <Toggle
                  key={g.tempId}
                  on={groupTempIds.includes(g.tempId)}
                  onClick={() =>
                    setGroupTempIds((prev) =>
                      prev.includes(g.tempId)
                        ? prev.filter((x) => x !== g.tempId)
                        : [...prev, g.tempId],
                    )
                  }
                >
                  {g.name}
                </Toggle>
              ))}
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" onClick={add}>
          <Plus className="mr-1.5 size-3.5" aria-hidden />
          Stage item
        </Button>
      </div>
    </div>
  );
}

/**
 * Edit one staged item in place. Combo components and option groups are carried
 * over untouched — this dialog covers the everyday fields (name, price, the
 * public detail fields, image).
 */
function ItemEditDialog({
  item,
  mode,
  products,
  saving,
  onSave,
  onClose,
}: {
  item: DraftItem;
  mode: "add" | "edit";
  products: SellableProduct[];
  saving: boolean;
  onSave: (item: DraftItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price);
  const [category, setCategory] = useState(item.category ?? "");
  const [productId, setProductId] = useState(
    item.product_id != null ? String(item.product_id) : "",
  );
  const [description, setDescription] = useState(item.description ?? "");
  const [calories, setCalories] = useState(item.calories != null ? String(item.calories) : "");
  const [prepTime, setPrepTime] = useState(
    item.prep_time_minutes != null ? String(item.prep_time_minutes) : "",
  );
  const [imageUrl, setImageUrl] = useState(item.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function save() {
    if (!name.trim() || !/^\d+(\.\d{1,2})?$/.test(price)) {
      toast.error("An item needs a name and a price like 250.00");
      return;
    }
    onSave({
      ...item,
      name: name.trim(),
      price,
      product_id: productId ? Number(productId) : null,
      category: category.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      description: description.trim() || undefined,
      calories: calories.trim() ? Number(calories) : null,
      prep_time_minutes: prepTime.trim() ? Number(prepTime) : null,
    });
  }

  /** Picking a catalogue product prefills its name, price, and category. */
  function pickProduct(product: SellableProduct | null) {
    if (!product) {
      setProductId("");
      return;
    }
    setProductId(String(product.id));
    setName(product.name);
    if (product.selling_price) setPrice(product.selling_price);
    if (product.category) setCategory(product.category);
  }

  const preview = resolveImageUrl(imageUrl) ?? imageUrl;

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add item" : "Edit item"}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "The item is added and published to the live menu."
              : "Saving publishes the change to the live menu."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {mode === "edit" && item.is_combo && (
            <p className="rounded-lg border border-line bg-surface-2 p-2 text-xs text-faint">
              This is a combo — its components and option groups are kept as they are.
            </p>
          )}

          {mode === "add" && products.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">From the catalogue</Label>
              <ProductPicker products={products} valueId={productId} onPick={pickProduct} />
              <p className="text-xs text-faint">
                Pick a product to prefill and link it to stock, or fill in a custom item below.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="edit-name">
                Name
              </Label>
              <Input
                id="edit-name"
                className="h-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="edit-price">
                Price
              </Label>
              <Input
                id="edit-price"
                className="h-9"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="edit-category">
              Category
            </Label>
            <Input
              id="edit-category"
              className="h-9"
              placeholder="Mains"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="edit-description">
              Description <span className="text-faint">(optional)</span>
            </Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="edit-calories">
                Calories <span className="text-faint">(optional)</span>
              </Label>
              <Input
                id="edit-calories"
                className="h-9"
                inputMode="numeric"
                placeholder="580"
                value={calories}
                onChange={(e) => setCalories(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="edit-prep-time">
                Prep time <span className="text-faint">(optional)</span>
              </Label>
              <Input
                id="edit-prep-time"
                className="h-9"
                inputMode="numeric"
                placeholder="25"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Product image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                if (file.size > 10 * 1024 * 1024) {
                  toast.error("Image must be under 10 MB");
                  return;
                }
                setUploading(true);
                try {
                  setImageUrl(await posAdminApi.uploadMenuImage(file));
                } catch (err) {
                  toast.error(imageUploadErrorMessage(err));
                } finally {
                  setUploading(false);
                }
              }}
            />
            {imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-20 w-20 rounded-xl border border-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-white shadow-soft"
                  aria-label="Remove image"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface-2 text-sm text-muted transition hover:border-brand/50 hover:text-content disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-brand" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-4" />
                    Upload image
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <span className="mr-1.5 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {mode === "add" ? "Adding…" : "Saving…"}
              </>
            ) : mode === "add" ? (
              "Add to menu"
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg border px-2.5 text-xs font-medium transition",
        on
          ? "border-brand bg-brand/10 text-content"
          : "border-line bg-surface text-muted hover:border-brand/50",
      )}
    >
      {children}
    </button>
  );
}
