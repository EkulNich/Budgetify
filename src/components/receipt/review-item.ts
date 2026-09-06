import type { CategoryKey } from "@/constants/categories";
import type { ReceiptItem } from "@/lib/receipt";

export type ReviewItem = {
  id: string;
  name: string;
  category: CategoryKey | null;
  /** Editable string, seeded from the scanned price. */
  price: string;
  /** Pool member user_ids this item is assigned to. Empty = unassigned. Unused outside a pool. */
  assignedTo: Set<string>;
};

let nextId = 0;

export function makeReviewItems(items: ReceiptItem[]): ReviewItem[] {
  return items.map((item) => ({
    id: `item-${nextId++}`,
    name: item.name,
    category: null,
    price: item.price.toFixed(2),
    assignedTo: new Set<string>(),
  }));
}
