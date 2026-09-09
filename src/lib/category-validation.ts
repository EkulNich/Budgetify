const RESERVED_NAMES = ["food", "transport", "entertainment", "loans", "others"];

const MIN_LENGTH = 1;
const MAX_LENGTH = 30;

export type ExistingCategory = {
    id: number;
    name: string;
    label: string;
    isArchived: boolean;
};

export type ExistingAlias = {
    oldName: string;
    currentLabel: string;
};

export type CategoryNameCheck =
    | { valid: true; normalized: string }
    | { valid: false; reason: "reserved" | "too_short" | "too_long" }
    | { valid: false; reason: "duplicate_active" }
    | { valid: false; reason: "duplicate_archived"; archivedId: number }
    | { valid: false; reason: "alias_conflict"; currentLabel: string };

export type InvalidCategoryNameCheck = Extract<CategoryNameCheck, { valid: false }>;

export class CategoryValidationError extends Error {
    constructor(public readonly check: InvalidCategoryNameCheck) {
        super(`Invalid category name: ${check.reason}`);
    }
}

/**
 * Validates a category name within one scope (a user's personal categories,
 * or one pool's categories) — trims/lowercases for comparison, rejects
 * reserved system keys, and checks for a conflict against existing category
 * names (active or archived) or a remembered alias from an earlier rename.
 */
export function validateCategoryName(
    label: string,
    existing: ExistingCategory[],
    aliases: ExistingAlias[],
): CategoryNameCheck {
    const normalized = label.trim().toLowerCase();

    if (normalized.length < MIN_LENGTH) return { valid: false, reason: "too_short" };
    if (normalized.length > MAX_LENGTH) return { valid: false, reason: "too_long" };
    if (RESERVED_NAMES.includes(normalized)) return { valid: false, reason: "reserved" };

    const activeDuplicate = existing.find((c) => c.name === normalized && !c.isArchived);
    if (activeDuplicate) return { valid: false, reason: "duplicate_active" };

    const archivedDuplicate = existing.find((c) => c.name === normalized && c.isArchived);
    if (archivedDuplicate) {
        return { valid: false, reason: "duplicate_archived", archivedId: archivedDuplicate.id };
    }

    const aliasConflict = aliases.find((a) => a.oldName === normalized);
    if (aliasConflict) {
        return { valid: false, reason: "alias_conflict", currentLabel: aliasConflict.currentLabel };
    }

    return { valid: true, normalized };
}
