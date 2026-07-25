import { describe, expect, test } from "@jest/globals";
import { calculateStreak } from "../src/lib/streak";

describe("calculateStreak", () => {
    test("first-ever expense starts streak at 1", () => {
        expect(calculateStreak(null, 0, "2026-07-25")).toBe(1);
    });

    test("same-day expense does not change streak", () => {
        expect(calculateStreak("2026-07-25", 5, "2026-07-25")).toBe(5);
    });

    test("expense one day later increments streak", () => {
        expect(calculateStreak("2026-07-24", 5, "2026-07-25")).toBe(6);
    });

    test("expense after a 2-day gap resets streak to 1", () => {
        expect(calculateStreak("2026-07-23", 5, "2026-07-25")).toBe(1);
    });

    test("expense after a long gap resets streak to 1", () => {
        expect(calculateStreak("2026-06-01", 20, "2026-07-25")).toBe(1);
    });

    test("null streak count on yesterday still increments", () => {
        expect(calculateStreak("2026-07-24", 0, "2026-07-25")).toBe(1);
    });
});
