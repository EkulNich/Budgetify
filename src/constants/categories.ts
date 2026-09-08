import type { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

export const CATEGORIES = [
  { key: "food", label: "Food", color: "#4CAF50", icon: "fast-food-outline" },
  { key: "transport", label: "Transport", color: "#2196F3", icon: "car-outline" },
  {
    key: "entertainment",
    label: "Entertainment",
    color: "#FF9800",
    icon: "game-controller-outline",
  },
  { key: "loans", label: "Loans", color: "#F44336", icon: "card-outline" },
  {
    key: "others",
    label: "Others",
    color: "#9C27B0",
    icon: "ellipsis-horizontal-circle-outline",
  },
] as const satisfies { key: string; label: string; color: string; icon: IconName }[];

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

const STANDARD_CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.color]),
);

const STANDARD_CATEGORY_ICONS: Record<string, IconName> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.icon]),
);

/** Fallback icon for a category outside the standard taxonomy (e.g. group-pool expenses). */
export const DEFAULT_CATEGORY_ICON: IconName = "pricetag-outline";

/** Fallback palette for categories outside the standard taxonomy (e.g. group-pool expenses). */
export const CUSTOM_CATEGORY_COLORS = [
  "#00ACC1",
  "#7E57C2",
  "#EC407A",
  "#8D6E63",
  "#26A69A",
  "#5C6BC0",
  "#D4A017",
  "#AB47BC",
  "#78909C",
  "#66BB6A",
  "#EF6C00",
  "#42A5F5",
];

/** Assigns each category a color: standard categories get their fixed color, others cycle through the custom palette. */
export function getCategoryColorMap(categories: string[]): Record<string, string> {
  const colorMap: Record<string, string> = {};
  let customColorIndex = 0;

  for (const category of categories) {
    const key = category.toLowerCase().trim();
    const standardColor = STANDARD_CATEGORY_COLORS[key];

    if (standardColor) {
      colorMap[category] = standardColor;
      continue;
    }

    colorMap[category] =
      CUSTOM_CATEGORY_COLORS[customColorIndex % CUSTOM_CATEGORY_COLORS.length];
    customColorIndex += 1;
  }

  return colorMap;
}

/** The icon for a category — the standard taxonomy's own icon, or a generic tag for anything else. */
export function getCategoryIcon(category: string | null): IconName {
  if (!category) return DEFAULT_CATEGORY_ICON;
  return STANDARD_CATEGORY_ICONS[category.toLowerCase().trim()] ?? DEFAULT_CATEGORY_ICON;
}

/** Fallback color for a single category outside the standard taxonomy — see `getCategoryColorMap` for a whole list. */
export const DEFAULT_CATEGORY_COLOR = "#78909C";

/** The color for a single category — the standard taxonomy's own color, or a neutral grey for anything else. */
export function getCategoryColor(category: string | null): string {
  if (!category) return DEFAULT_CATEGORY_COLOR;
  return STANDARD_CATEGORY_COLORS[category.toLowerCase().trim()] ?? DEFAULT_CATEGORY_COLOR;
}
