import { describe, expect, test } from "@jest/globals";
import { calculateStreak, getDisplayStreak } from "../src/lib/streak";

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

describe("getDisplayStreak", () => {
    test("no last expense date shows no streak", () => {
        expect(getDisplayStreak(null, 5, "2026-07-25")).toBe(0);
    });

    test("expense today still shows the stored streak", () => {
        expect(getDisplayStreak("2026-07-25", 5, "2026-07-25")).toBe(5);
    });

    test("expense yesterday still shows the stored streak", () => {
        expect(getDisplayStreak("2026-07-24", 5, "2026-07-25")).toBe(5);
    });

    test("expense older than yesterday hides the streak", () => {
        expect(getDisplayStreak("2026-07-23", 5, "2026-07-25")).toBe(0);
    });

    test("null stored count on a valid day displays as 0", () => {
        expect(getDisplayStreak("2026-07-25", null as unknown as number, "2026-07-25")).toBe(0);
    });
});
