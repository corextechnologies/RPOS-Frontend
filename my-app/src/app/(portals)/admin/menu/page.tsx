"use client";

import { useRef, useState } from "react";
import {
  ImagePlus,
  Layers,
  Lock,
  Pencil,
  Plus,
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
import { Badge } from "@/components/ui/badge";
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

  const errors = draft.items.length ? validateDraft(draft) : [];
  const canPublish = draft.items.length > 0 && errors.length === 0;
  const editingItem = editingTempId
    ? (draft.items.find((i) => i.tempId === editingTempId) ?? null)
    : null;

  /** Replace one staged item in place — the fix for edits duplicating items. */
  function saveEditedItem(updated: DraftItem) {
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.tempId === updated.tempId ? updated : i)),
    }));
    setEditingTempId(null);
    toast.success("Item updated — publish to apply it.");
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
        <LiveMenu live={live} onEditItem={editLiveItem} />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next version</CardTitle>
              <CardDescription>
                Staged here and published all at once. Nothing goes live until you publish.
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
                onEditItem={setEditingTempId}
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
          onSave={saveEditedItem}
          onClose={() => setEditingTempId(null)}
        />
      )}
    </div>
  );
}

function LiveMenu({
  live,
  onEditItem,
}: {
  live: ReturnType<typeof usePublishedMenu>;
  onEditItem: (itemId: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Live menu
          <Lock className="size-3.5 text-faint" aria-label="Immutable" />
        </CardTitle>
        <CardDescription>
          {live.data
            ? `Version ${live.data.menu_version_id} · ${live.data.items.length} item(s)`
            : "Nothing published yet"}
        </CardDescription>
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
                <TableHead className="w-12 text-right">Edit</TableHead>
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
                    <button
                      type="button"
                      onClick={() => onEditItem(item.id)}
                      className="text-faint transition hover:text-brand"
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
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

function ItemBuilder({
  draft,
  products,
  onChange,
  onEditItem,
}: {
  draft: MenuDraft;
  products: SellableProduct[];
  onChange: (items: DraftItem[]) => void;
  onEditItem: (tempId: string) => void;
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
      <Label className="text-xs uppercase tracking-wide text-faint">Items</Label>

      {draft.items.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {draft.items.map((item) => (
            <li key={item.tempId} className="flex items-center gap-2 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm text-content">
                  {item.name}
                  {item.is_combo && (
                    <Badge variant="outline" className="gap-1 text-accent">
                      <Layers className="size-2.5" aria-hidden />
                      combo
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-faint">
                  {item.category ?? "No category"}
                  {item.groupTempIds.length > 0 && ` · ${item.groupTempIds.length} group(s)`}
                  {item.componentTempIds.length > 0 &&
                    ` · ${item.componentTempIds.length} component(s)`}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted">{item.price}</span>
              <button
                type="button"
                className="text-faint transition hover:text-brand"
                onClick={() => onEditItem(item.tempId)}
                aria-label={`Edit ${item.name}`}
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="text-faint hover:text-danger"
                onClick={() => onChange(draft.items.filter((d) => d.tempId !== item.tempId))}
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

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
            <select
              value={productId}
              onChange={(e) => pick(e.target.value)}
              className="h-9 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-content"
            >
              <option value="">Custom item…</option>
              {products.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                  {p.kind === "RESALE" ? " (resale)" : ""}
                  {p.selling_price ? ` — ${p.selling_price}` : " — not priced"}
                </option>
              ))}
            </select>

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
  onSave,
  onClose,
}: {
  item: DraftItem;
  onSave: (item: DraftItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price);
  const [category, setCategory] = useState(item.category ?? "");
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
      category: category.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      description: description.trim() || undefined,
      calories: calories.trim() ? Number(calories) : null,
      prep_time_minutes: prepTime.trim() ? Number(prepTime) : null,
    });
  }

  const preview = resolveImageUrl(imageUrl) ?? imageUrl;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>Changes apply when you publish the next version.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {item.is_combo && (
            <p className="rounded-lg border border-line bg-surface-2 p-2 text-xs text-faint">
              This is a combo — its components and option groups are kept as they are.
            </p>
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save changes</Button>
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
