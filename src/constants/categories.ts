export const CATEGORIES = [
  { key: "food", label: "Food", color: "#4CAF50" },
  { key: "transport", label: "Transport", color: "#2196F3" },
  { key: "entertainment", label: "Entertainment", color: "#FF9800" },
  { key: "loans", label: "Loans", color: "#F44336" },
  { key: "others", label: "Others", color: "#9C27B0" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

const STANDARD_CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.color]),
);

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
