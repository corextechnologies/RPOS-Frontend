import { describe, expect, it, vi } from "vitest";
import {
  MenuDraftError,
  orderItemsForCreate,
  publishDraft,
  toItemInput,
  validateDraft,
  type DraftGroup,
  type DraftItem,
  type MenuDraft,
  type PublishApi,
} from "./menu-draft";

function item(over: Partial<DraftItem> & { tempId: string; name: string }): DraftItem {
  return {
    price: "100.00",
    is_combo: false,
    componentTempIds: [],
    groupTempIds: [],
    ...over,
  };
}

function group(over: Partial<DraftGroup> & { tempId: string; name: string }): DraftGroup {
  return {
    min_select: 0,
    max_select: 2,
    options: [{ name: "Cheese", price_delta: "50.00" }],
    ...over,
  };
}

describe("orderItemsForCreate", () => {
  /**
   * The whole reason this exists: `component_item_ids` are real server ids, so
   * a combo cannot be created until its components have been.
   */
  it("puts components before the combo that contains them", () => {
    const burger = item({ tempId: "a", name: "Burger" });
    const meal = item({ tempId: "b", name: "Meal", is_combo: true, componentTempIds: ["a"] });
    const order = orderItemsForCreate([meal, burger]).map((i) => i.tempId);
    expect(order).toEqual(["a", "b"]);
  });

  it("handles a combo of a combo", () => {
    const bun = item({ tempId: "a", name: "Bun" });
    const burger = item({ tempId: "b", name: "Burger", is_combo: true, componentTempIds: ["a"] });
    const feast = item({ tempId: "c", name: "Feast", is_combo: true, componentTempIds: ["b"] });
    expect(orderItemsForCreate([feast, burger, bun]).map((i) => i.tempId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("keeps independent items and emits each exactly once", () => {
    const a = item({ tempId: "a", name: "A" });
    const b = item({ tempId: "b", name: "B" });
    const combo = item({ tempId: "c", name: "C", is_combo: true, componentTempIds: ["a", "b"] });
    const out = orderItemsForCreate([combo, a, b]);
    expect(out).toHaveLength(3);
    expect(out.map((i) => i.tempId).indexOf("c")).toBe(2);
  });

  /** A publish that loops forever is worse than one that refuses to start. */
  it("throws on a cycle rather than hanging", () => {
    const a = item({ tempId: "a", name: "A", is_combo: true, componentTempIds: ["b"] });
    const b = item({ tempId: "b", name: "B", is_combo: true, componentTempIds: ["a"] });
    expect(() => orderItemsForCreate([a, b])).toThrow(MenuDraftError);
    expect(() => orderItemsForCreate([a, b])).toThrow(/contains itself/);
  });

  it("throws on a self-reference", () => {
    const a = item({ tempId: "a", name: "A", is_combo: true, componentTempIds: ["a"] });
    expect(() => orderItemsForCreate([a])).toThrow(/contains itself/);
  });

  it("throws when a component isn't in the draft", () => {
    const combo = item({ tempId: "a", name: "A", is_combo: true, componentTempIds: ["ghost"] });
    expect(() => orderItemsForCreate([combo])).toThrow(/isn't in this draft/);
  });

  it("is fine with an empty draft", () => {
    expect(orderItemsForCreate([])).toEqual([]);
  });
});

describe("validateDraft", () => {
  const ok: MenuDraft = { groups: [], items: [item({ tempId: "a", name: "Burger" })] };

  it("passes a good draft", () => {
    expect(validateDraft(ok)).toEqual([]);
  });

  it("rejects an empty draft", () => {
    expect(validateDraft({ groups: [], items: [] })).toContain(
      "Add at least one item before publishing.",
    );
  });

  it("rejects a bad price", () => {
    for (const price of ["", "abc", "1.234", "-5"]) {
      const errs = validateDraft({ groups: [], items: [item({ tempId: "a", name: "X", price })] });
      expect(errs.some((e) => e.includes("price"))).toBe(true);
    }
  });

  it("rejects an empty combo", () => {
    const errs = validateDraft({
      groups: [],
      items: [item({ tempId: "a", name: "Meal", is_combo: true })],
    });
    expect(errs).toContain('"Meal" is a combo but contains nothing.');
  });

  /**
   * A combo holds no stock of its own. Linking one to a product would deduct
   * twice — once for the combo, once for each component's own recipe.
   */
  it("rejects a combo linked to a product", () => {
    const errs = validateDraft({
      groups: [],
      items: [
        item({ tempId: "a", name: "Burger" }),
        item({
          tempId: "b",
          name: "Meal",
          is_combo: true,
          componentTempIds: ["a"],
          product_id: 5,
        }),
      ],
    });
    expect(errs).toContain('"Meal" is a combo, so it can\'t be linked to a product.');
  });

  it("rejects a group with no options", () => {
    const errs = validateDraft({
      groups: [group({ tempId: "g", name: "Extras", options: [] })],
      items: ok.items,
    });
    expect(errs).toContain('"Extras" has no options.');
  });

  it("rejects a group demanding more choices than it offers", () => {
    const errs = validateDraft({
      groups: [group({ tempId: "g", name: "Sauce", min_select: 3 })],
      items: ok.items,
    });
    expect(errs.some((e) => e.includes("only offers 1"))).toBe(true);
  });

  it("rejects max below min", () => {
    const errs = validateDraft({
      groups: [
        group({
          tempId: "g",
          name: "Sauce",
          min_select: 2,
          max_select: 1,
          options: [
            { name: "A", price_delta: "0" },
            { name: "B", price_delta: "0" },
          ],
        }),
      ],
      items: ok.items,
    });
    expect(errs).toContain('"Sauce" has a maximum below its minimum.');
  });

  it("allows max_select 0 as unlimited", () => {
    expect(
      validateDraft({
        groups: [group({ tempId: "g", name: "Extras", max_select: 0 })],
        items: ok.items,
      }),
    ).toEqual([]);
  });

  it("allows a negative option delta — a discount is a valid modifier", () => {
    expect(
      validateDraft({
        groups: [
          group({ tempId: "g", name: "Extras", options: [{ name: "No cheese", price_delta: "-50.00" }] }),
        ],
        items: ok.items,
      }),
    ).toEqual([]);
  });

  it("reports every problem at once, deduplicated", () => {
    const errs = validateDraft({
      groups: [group({ tempId: "g", name: "", options: [] })],
      items: [item({ tempId: "a", name: "", price: "x" })],
    });
    expect(errs.length).toBeGreaterThan(2);
    expect(new Set(errs).size).toBe(errs.length);
  });
});

describe("toItemInput", () => {
  it("maps component and group temp ids to real ids", () => {
    const input = toItemInput(
      item({
        tempId: "c",
        name: "Meal",
        is_combo: true,
        componentTempIds: ["a", "b"],
        groupTempIds: ["g"],
      }),
      new Map([["g", 90]]),
      new Map([
        ["a", 10],
        ["b", 20],
      ]),
    );
    expect(input.component_item_ids).toEqual([10, 20]);
    expect(input.modifier_group_ids).toEqual([90]);
  });

  /** The guide: a combo "holds no stock of its own" and its product_id is null. */
  it("forces a combo's product_id to null", () => {
    const input = toItemInput(
      item({ tempId: "c", name: "Meal", is_combo: true, componentTempIds: [], product_id: 7 }),
      new Map(),
      new Map(),
    );
    expect(input.product_id).toBeNull();
  });

  it("keeps a plain item's product_id, which is what links it to stock", () => {
    const input = toItemInput(
      item({ tempId: "a", name: "Burger", product_id: 7 }),
      new Map(),
      new Map(),
    );
    expect(input.product_id).toBe(7);
    expect(input.is_combo).toBeUndefined();
    expect(input.component_item_ids).toBeUndefined();
  });

  it("omits empty optionals rather than sending blanks", () => {
    const input = toItemInput(
      item({ tempId: "a", name: "Burger", category: "  ", image_url: "" }),
      new Map(),
      new Map(),
    );
    expect(input.category).toBeUndefined();
    expect(input.image_url).toBeUndefined();
    expect(input.modifier_group_ids).toBeUndefined();
  });
});

describe("publishDraft", () => {
  function fakeApi() {
    let next = 100;
    const calls: string[] = [];
    const api: PublishApi = {
      createMenuVersion: vi.fn(async () => {
        calls.push("version");
        return { id: 1 };
      }),
      createModifierGroup: vi.fn(async () => {
        calls.push("group");
        return { id: next++ };
      }),
      createMenuItem: vi.fn(async (_v, input) => {
        calls.push(`item:${input.name}`);
        return { id: next++ };
      }),
      publishMenuVersion: vi.fn(async () => {
        calls.push("publish");
        return {};
      }),
    };
    return { api, calls };
  }

  /** version → groups → components → combos → publish. In that order, always. */
  it("creates everything in dependency order and publishes last", async () => {
    const { api, calls } = fakeApi();
    await publishDraft(
      {
        groups: [group({ tempId: "g", name: "Extras" })],
        items: [
          item({ tempId: "b", name: "Meal", is_combo: true, componentTempIds: ["a"] }),
          item({ tempId: "a", name: "Burger", groupTempIds: ["g"] }),
        ],
      },
      api,
    );
    expect(calls).toEqual(["version", "group", "item:Burger", "item:Meal", "publish"]);
  });

  it("passes real ids through to the combo", async () => {
    const { api } = fakeApi();
    await publishDraft(
      {
        groups: [],
        items: [
          item({ tempId: "a", name: "Burger" }),
          item({ tempId: "b", name: "Meal", is_combo: true, componentTempIds: ["a"] }),
        ],
      },
      api,
    );
    const comboCall = (api.createMenuItem as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[1].name === "Meal",
    );
    expect(comboCall?.[1].component_item_ids).toEqual([100]);
  });

  it("refuses to start on an invalid draft — nothing is created", async () => {
    const { api, calls } = fakeApi();
    await expect(publishDraft({ groups: [], items: [] }, api)).rejects.toThrow(MenuDraftError);
    expect(calls).toEqual([]);
  });

  /**
   * Publish is last so a mid-way failure leaves the version UNPUBLISHED and
   * invisible to every till, rather than half a menu live.
   */
  it("does not publish when an item fails", async () => {
    const { api, calls } = fakeApi();
    api.createMenuItem = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(
      publishDraft({ groups: [], items: [item({ tempId: "a", name: "Burger" })] }, api),
    ).rejects.toThrow("boom");
    expect(calls).not.toContain("publish");
  });
});
