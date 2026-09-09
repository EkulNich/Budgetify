declare const describe: any;
declare const test: any;
declare const expect: any;

import { validateCategoryName } from "../src/lib/category-validation";

describe("validateCategoryName", () => {
    test("trims and lowercases for comparison", () => {
        const result = validateCategoryName("  Gym  ", [], []);
        expect(result).toEqual({ valid: true, normalized: "gym" });
    });

    test("rejects each reserved system name", () => {
        for (const name of ["Food", "transport", "Entertainment", "LOANS", "others"]) {
            expect(validateCategoryName(name, [], [])).toEqual({
                valid: false,
                reason: "reserved",
            });
        }
    });

    test("rejects an active duplicate in the same scope", () => {
        const existing = [{ id: 1, name: "gym", label: "Gym", isArchived: false }];
        expect(validateCategoryName("Gym", existing, [])).toEqual({
            valid: false,
            reason: "duplicate_active",
        });
    });

    test("distinguishes an archived duplicate and returns its id", () => {
        const existing = [{ id: 7, name: "gym", label: "Gym", isArchived: true }];
        expect(validateCategoryName("gym", existing, [])).toEqual({
            valid: false,
            reason: "duplicate_archived",
            archivedId: 7,
        });
    });

    test("rejects a name that conflicts with an alias, naming the current label", () => {
        const aliases = [{ oldName: "coffee", currentLabel: "Cafes" }];
        expect(validateCategoryName("Coffee", [], aliases)).toEqual({
            valid: false,
            reason: "alias_conflict",
            currentLabel: "Cafes",
        });
    });

    test("rejects an empty name", () => {
        expect(validateCategoryName("   ", [], [])).toEqual({
            valid: false,
            reason: "too_short",
        });
    });

    test("rejects a name longer than 30 characters", () => {
        const longName = "a".repeat(31);
        expect(validateCategoryName(longName, [], [])).toEqual({
            valid: false,
            reason: "too_long",
        });
    });

    test("allows a 30-character name", () => {
        const maxName = "a".repeat(30);
        expect(validateCategoryName(maxName, [], [])).toEqual({
            valid: true,
            normalized: maxName,
        });
    });
});
