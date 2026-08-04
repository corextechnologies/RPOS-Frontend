import { describe, expect, it } from "vitest";
import { Store } from "lucide-react";
import { visibleNavItems } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";
import type { AuthAction } from "@/lib/auth/actions";

const allow = (_action: AuthAction) => true;

const items: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Store },
  { label: "Kitchens", href: "/kitchens", icon: Store, requiresFeature: "central_kitchen" },
];

describe("visibleNavItems — feature gating", () => {
  it("hides a feature-gated item when the feature is false", () => {
    const out = visibleNavItems(items, allow, { central_kitchen: false });
    expect(out.map((i) => i.label)).toEqual(["Dashboard"]);
  });

  it("shows it when the feature is true", () => {
    const out = visibleNavItems(items, allow, { central_kitchen: true });
    expect(out.map((i) => i.label)).toEqual(["Dashboard", "Kitchens"]);
  });

  it("shows it when no features are provided — unknown never hides", () => {
    const out = visibleNavItems(items, allow);
    expect(out.map((i) => i.label)).toEqual(["Dashboard", "Kitchens"]);
  });

  it("still enforces the action/can gate alongside the feature gate", () => {
    const deny = (action: AuthAction) => action !== "kitchens:read";
    const gated: NavItem[] = [
      {
        label: "Kitchens",
        href: "/kitchens",
        icon: Store,
        action: "kitchens:read",
        requiresFeature: "central_kitchen",
      },
    ];
    expect(visibleNavItems(gated, deny, { central_kitchen: true })).toHaveLength(0);
  });
});
