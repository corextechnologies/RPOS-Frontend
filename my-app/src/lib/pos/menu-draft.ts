/**
 * Staging and publishing a menu version.
 *
 * A published version is immutable, so the whole version is composed client-side
 * and then created in one go. That ordering is not arbitrary — the server hands
 * back ids, and later objects reference earlier ones:
 *
 *   version → modifier groups → component items → combo items → publish
 *
 * A combo's `component_item_ids` are real ids of items that must already exist,
 * which is why items are topologically sorted rather than created in the order
 * someone happened to type them.
 *
 * Staging client-side also avoids littering the database with abandoned drafts
 * every time an admin opens the page and changes their mind.
 */

import { minorToDecimalString } from "@/lib/money";
import type {
  CreateMenuItemInput,
  CreateModifierGroupInput,
  MenuModifierGroup,
  PosMenu,
} from "@/lib/types/pos";

export interface DraftOption {
  name: string;
  /** Decimal string — the authoring surface's convention, per the guide. */
  price_delta: string;
  product_id?: number | null;
}

export interface DraftGroup {
  tempId: string;
  name: string;
  min_select: number;
  max_select: number;
  options: DraftOption[];
}

export interface DraftItem {
  tempId: string;
  name: string;
  /** Decimal string; stored and returned by the server as `price_minor`. */
  price: string;
  product_id?: number | null;
  category?: string;
  image_url?: string;
  /** Marketing copy shown on the public menu item detail view. */
  description?: string;
  /** Energy in kilocalories; empty when not set. */
  calories?: number | null;
  /** Typical preparation time in minutes; empty when not set. */
  prep_time_minutes?: number | null;
  is_combo: boolean;
  /** Default the branch sub-kitchen finishes/makes this dish (seeds needs_prep). */
  made_to_order?: boolean;
  /** `tempId`s of other draft items this combo contains. */
  componentTempIds: string[];
  /** `tempId`s of draft modifier groups attached to this item. */
  groupTempIds: string[];
}

export interface MenuDraft {
  groups: DraftGroup[];
  items: DraftItem[];
}

/**
 * Seed a fresh draft from the live published menu.
 *
 * Published versions are immutable, so "editing the menu" — tweaking a price,
 * adding a couple of items — means composing a *new* version. Rather than retype
 * the whole thing, an admin loads the live menu into the draft, changes what they
 * need, and publishes. The result is a new version containing everything.
 *
 * tempIds are derived from the live ids (`item-<id>`, `group-<id>`) so combo
 * components and modifier-group links resolve deterministically to the same
 * seeded rows. Combo component quantity isn't part of the draft model, so a
 * component that appeared N times collapses to a single reference (same as
 * authoring a combo by hand).
 */
export function draftFromMenu(menu: PosMenu): MenuDraft {
  const itemTempId = (id: number) => `item-${id}`;
  const groupTempId = (id: number) => `group-${id}`;

  // Each modifier group can be attached to several items; stage it once.
  const groupsById = new Map<number, MenuModifierGroup>();
  for (const item of menu.items) {
    for (const group of item.modifier_groups) {
      if (!groupsById.has(group.id)) groupsById.set(group.id, group);
    }
  }

  const groups: DraftGroup[] = [...groupsById.values()].map((group) => ({
    tempId: groupTempId(group.id),
    name: group.name,
    min_select: group.min_select,
    max_select: group.max_select,
    options: group.options.map((option) => ({
      name: option.name,
      price_delta: minorToDecimalString(option.price_delta_minor),
      product_id: option.product_id ?? undefined,
    })),
  }));

  const items: DraftItem[] = menu.items.map((item) => ({
    tempId: itemTempId(item.id),
    name: item.name,
    price: minorToDecimalString(item.price_minor),
    product_id: item.product_id ?? null,
    category: item.category ?? undefined,
    image_url: item.image_url ?? undefined,
    description: item.description ?? undefined,
    calories: item.calories ?? null,
    prep_time_minutes: item.prep_time_minutes ?? null,
    is_combo: item.is_combo,
    made_to_order: item.made_to_order ?? false,
    componentTempIds: item.components.map((c) => itemTempId(c.item_id)),
    groupTempIds: item.modifier_groups.map((g) => groupTempId(g.id)),
  }));

  return { groups, items };
}

export class MenuDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MenuDraftError";
  }
}

/**
 * Order items so every component is created before the combo that contains it.
 *
 * Depth-first topological sort. Throws on a cycle rather than looping — a combo
 * that contains itself is a mistake worth stopping at, and the alternative is a
 * publish that hangs halfway through with a half-built version live.
 */
export function orderItemsForCreate(items: readonly DraftItem[]): DraftItem[] {
  const byId = new Map(items.map((i) => [i.tempId, i]));
  const sorted: DraftItem[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();

  function visit(item: DraftItem, trail: string[]) {
    if (done.has(item.tempId)) return;
    if (visiting.has(item.tempId)) {
      throw new MenuDraftError(
        `"${item.name}" contains itself (via ${trail.join(" → ")}). A combo can't be its own component.`,
      );
    }
    visiting.add(item.tempId);

    for (const componentId of item.componentTempIds) {
      const component = byId.get(componentId);
      if (!component) {
        throw new MenuDraftError(`"${item.name}" references an item that isn't in this draft.`);
      }
      visit(component, [...trail, item.name]);
    }

    visiting.delete(item.tempId);
    done.add(item.tempId);
    sorted.push(item);
  }

  for (const item of items) visit(item, [item.name]);
  return sorted;
}

/** Everything wrong with a draft, in one pass — not just the first thing. */
export function validateDraft(draft: MenuDraft): string[] {
  const errors: string[] = [];

  if (draft.items.length === 0) {
    errors.push("Add at least one item before publishing.");
  }

  for (const item of draft.items) {
    if (!item.name.trim()) errors.push("Every item needs a name.");
    if (!/^\d+(\.\d{1,2})?$/.test(item.price)) {
      errors.push(`"${item.name || "Item"}" needs a price like 250.00.`);
    }
    if (item.is_combo && item.componentTempIds.length === 0) {
      errors.push(`"${item.name}" is a combo but contains nothing.`);
    }
    // A combo holds no stock of its own — the guide is explicit that its
    // `product_id` is null. Linking one to stock would double-deduct: once for
    // the combo, once for each component.
    if (item.is_combo && item.product_id) {
      errors.push(`"${item.name}" is a combo, so it can't be linked to a product.`);
    }
  }

  for (const group of draft.groups) {
    if (!group.name.trim()) errors.push("Every modifier group needs a name.");
    if (group.options.length === 0) {
      errors.push(`"${group.name || "Group"}" has no options.`);
    }
    if (group.min_select > group.options.length) {
      errors.push(
        `"${group.name}" asks for ${group.min_select} choices but only offers ${group.options.length}.`,
      );
    }
    if (group.max_select > 0 && group.max_select < group.min_select) {
      errors.push(`"${group.name}" has a maximum below its minimum.`);
    }
    for (const option of group.options) {
      if (!/^-?\d+(\.\d{1,2})?$/.test(option.price_delta)) {
        errors.push(`"${option.name || "Option"}" needs a price change like 50.00 or 0.`);
      }
    }
  }

  try {
    orderItemsForCreate(draft.items);
  } catch (err) {
    if (err instanceof MenuDraftError) errors.push(err.message);
    else throw err;
  }

  return [...new Set(errors)];
}

export function toGroupInput(group: DraftGroup): CreateModifierGroupInput {
  return {
    name: group.name.trim(),
    min_select: group.min_select,
    max_select: group.max_select,
    options: group.options.map((o) => ({
      name: o.name.trim(),
      price_delta: o.price_delta,
      product_id: o.product_id ?? undefined,
    })),
  };
}

export function toItemInput(
  item: DraftItem,
  groupIds: ReadonlyMap<string, number>,
  itemIds: ReadonlyMap<string, number>,
): CreateMenuItemInput {
  return {
    name: item.name.trim(),
    price: item.price,
    product_id: item.is_combo ? null : (item.product_id ?? undefined),
    category: item.category?.trim() || undefined,
    image_url: item.image_url?.trim() || undefined,
    description: item.description?.trim() || undefined,
    calories: item.calories ?? undefined,
    prep_time_minutes: item.prep_time_minutes ?? undefined,
    is_combo: item.is_combo || undefined,
    made_to_order: item.made_to_order || undefined,
    component_item_ids: item.is_combo
      ? item.componentTempIds.map((t) => {
          const id = itemIds.get(t);
          if (id === undefined) {
            throw new MenuDraftError(`"${item.name}" was published before one of its components.`);
          }
          return id;
        })
      : undefined,
    modifier_group_ids: item.groupTempIds.length
      ? item.groupTempIds.map((t) => {
          const id = groupIds.get(t);
          if (id === undefined) {
            throw new MenuDraftError(`"${item.name}" references a modifier group that wasn't created.`);
          }
          return id;
        })
      : undefined,
  };
}

export interface PublishApi {
  createMenuVersion(): Promise<{ id: number }>;
  createModifierGroup(versionId: number, input: CreateModifierGroupInput): Promise<{ id: number }>;
  createMenuItem(versionId: number, input: CreateMenuItemInput): Promise<{ id: number }>;
  publishMenuVersion(versionId: number): Promise<unknown>;
}

/**
 * Build and publish the whole version.
 *
 * Sequential rather than parallel on purpose: the ids feed forward, and a burst
 * of concurrent creates against one draft version buys nothing at menu-sized
 * volumes while making a partial failure much harder to reason about.
 *
 * If a step throws, the version exists but stays UNPUBLISHED — invisible to
 * every till. That's the useful failure mode, and it's why publish is last.
 */
export async function publishDraft(draft: MenuDraft, api: PublishApi): Promise<number> {
  const errors = validateDraft(draft);
  if (errors.length) throw new MenuDraftError(errors[0]);

  const version = await api.createMenuVersion();

  const groupIds = new Map<string, number>();
  for (const group of draft.groups) {
    const created = await api.createModifierGroup(version.id, toGroupInput(group));
    groupIds.set(group.tempId, created.id);
  }

  const itemIds = new Map<string, number>();
  for (const item of orderItemsForCreate(draft.items)) {
    const created = await api.createMenuItem(version.id, toItemInput(item, groupIds, itemIds));
    itemIds.set(item.tempId, created.id);
  }

  await api.publishMenuVersion(version.id);
  return version.id;
}
