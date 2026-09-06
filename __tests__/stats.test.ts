declare const describe: any;
declare const test: any;
declare const expect: any;

import {
    buildBudgetTrajectory,
    buildDailyCumulativeSeries,
    calculateAverageDailySpend,
    calculateCategoryChangePercent,
    calculatePercentSpent,
    calculateProjectedSpending,
    calculateSafeDailySpend,
} from "../src/lib/stats";

describe("calculatePercentSpent", () => {
    test("half of budget spent = 50%", () => {
        expect(calculatePercentSpent(500, 1000)).toBe(50);
    });

    test("nothing spent = 0%", () => {
        expect(calculatePercentSpent(0, 1000)).toBe(0);
    });

    test("full budget spent = 100%", () => {
        expect(calculatePercentSpent(1000, 1000)).toBe(100);
    });

    test("over budget = more than 100%", () => {
        expect(calculatePercentSpent(1500, 1000)).toBe(150);
    });

    test("zero budget returns 0 (no divide by zero)", () => {
        expect(calculatePercentSpent(100, 0)).toBe(0);
    });

    test("negative budget returns 0", () => {
        expect(calculatePercentSpent(100, -50)).toBe(0);
    });
});

describe("buildDailyCumulativeSeries", () => {
    test("accumulates amounts across days in order", () => {
        const series = buildDailyCumulativeSeries(
            [
                { amount: 10, created_at: "2026-06-01T10:00:00.000Z" },
                { amount: 5, created_at: "2026-06-01 20:00:00.710308+00" },
                { amount: 20, created_at: "2026-06-03T00:00:00.000Z" },
            ],
            5,
        );
        expect(series).toEqual([
            { day: 1, amount: 15 },
            { day: 2, amount: 15 },
            { day: 3, amount: 35 },
            { day: 4, amount: 35 },
            { day: 5, amount: 35 },
        ]);
    });

    test("no expenses returns a flat zero series", () => {
        const series = buildDailyCumulativeSeries([], 3);
        expect(series).toEqual([
            { day: 1, amount: 0 },
            { day: 2, amount: 0 },
            { day: 3, amount: 0 },
        ]);
    });

    test("ignores expenses outside the given month length", () => {
        const series = buildDailyCumulativeSeries(
            [{ amount: 100, created_at: "2026-06-31T00:00:00.000Z" }],
            30,
        );
        expect(series[29].amount).toBe(0);
    });
});

describe("buildBudgetTrajectory", () => {
    test("spreads the budget evenly across the month", () => {
        const series = buildBudgetTrajectory(300, 3);
        expect(series).toEqual([
            { day: 1, amount: 100 },
            { day: 2, amount: 200 },
            { day: 3, amount: 300 },
        ]);
    });
});

describe("calculateProjectedSpending", () => {
    test("extrapolates current pace across the full month", () => {
        expect(calculateProjectedSpending(300, 10, 30)).toBe(900);
    });

    test("zero days elapsed returns 0", () => {
        expect(calculateProjectedSpending(0, 0, 30)).toBe(0);
    });
});

describe("calculateSafeDailySpend", () => {
    test("divides remaining budget by days remaining", () => {
        expect(calculateSafeDailySpend(600, 15)).toBe(40);
    });

    test("zero days remaining treats it as the last day", () => {
        expect(calculateSafeDailySpend(50, 0)).toBe(50);
    });

    test("can go negative when over budget", () => {
        expect(calculateSafeDailySpend(-100, 10)).toBe(-10);
    });
});

describe("calculateAverageDailySpend", () => {
    test("divides total spend by days elapsed", () => {
        expect(calculateAverageDailySpend(480, 10)).toBe(48);
    });

    test("zero days elapsed treats it as one day", () => {
        expect(calculateAverageDailySpend(48, 0)).toBe(48);
    });
});

describe("calculateCategoryChangePercent", () => {
    test("computes percent increase", () => {
        expect(calculateCategoryChangePercent(123, 100)).toBe(23);
    });

    test("computes percent decrease", () => {
        expect(calculateCategoryChangePercent(80, 100)).toBe(-20);
    });

    test("no prior spending returns null", () => {
        expect(calculateCategoryChangePercent(50, 0)).toBeNull();
    });
});
