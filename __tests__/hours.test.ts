import { describe, expect, test } from "@jest/globals";
import { calculateHoursNeeded, getWorkBreakdown } from "../src/lib/hours";

describe("calculateHoursNeeded", () => {
    test("standard case: $200 expense on $4000 monthly at 40 hrs/week", () => {
        // monthlyHours = 40*52/12 ≈ 173.33, hourlyRate ≈ 23.08, hours ≈ 8.67
        const result = calculateHoursNeeded(200, 4000, 40);
        expect(result).toBeCloseTo(8.67, 1);
    });

    test("zero expense means zero hours", () => {
        expect(calculateHoursNeeded(0, 4000, 40)).toBe(0);
    });

    test("expense equal to monthly salary means one month of work hours", () => {
        const result = calculateHoursNeeded(4000, 4000, 40);
        expect(result).toBeCloseTo(173.33, 1);
    });

    test("higher hours/week means more hours needed for same expense (lower hourly rate)", () => {
        const at40 = calculateHoursNeeded(200, 4000, 40);
        const at60 = calculateHoursNeeded(200, 4000, 60);
        expect(at60).toBeGreaterThan(at40);
    });
});

describe("getWorkBreakdown", () => {
    test("less than an hour returns only minutes", () => {
        expect(getWorkBreakdown(0.5, 40)).toEqual({
            days: 0,
            hours: 0,
            minutes: 30,
        });
    });

    test("exactly one hour returns 1 hour", () => {
        expect(getWorkBreakdown(1, 40)).toEqual({
            days: 0,
            hours: 1,
            minutes: 0,
        });
    });

    test("8 hours at 40 hrs/week = 1 day (8 hrs/day)", () => {
        expect(getWorkBreakdown(8, 40)).toEqual({
            days: 1,
            hours: 0,
            minutes: 0,
        });
    });

    test("9.5 hours at 40 hrs/week = 1 day 1 hour 30 mins", () => {
        expect(getWorkBreakdown(9.5, 40)).toEqual({
            days: 1,
            hours: 1,
            minutes: 30,
        });
    });

    test("null hoursPerWeek defaults to 8 hrs/day", () => {
        expect(getWorkBreakdown(8, null)).toEqual({
            days: 1,
            hours: 0,
            minutes: 0,
        });
    });

    test("very small hoursPerWeek still rounds to at least 1 hour/day", () => {
        // 3/5 rounds to 1, so 2 hours = 2 days
        expect(getWorkBreakdown(2, 3)).toEqual({
            days: 2,
            hours: 0,
            minutes: 0,
        });
    });
});
