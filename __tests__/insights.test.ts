declare const describe: any;
declare const test: any;
declare const expect: any;

import { buildInsights } from "../src/lib/insights";

const baseInput = {
    categoryTotals: [] as { label: string; current: number; previous: number }[],
    currentAvgDailySpend: 0,
    previousAvgDailySpend: 0,
    projectedTotal: 0,
    budget: 0,
    currency: "SGD",
};

describe("buildInsights", () => {
    test("flags a category that rose significantly vs last month", () => {
        const insights = buildInsights({
            ...baseInput,
            categoryTotals: [{ label: "food", current: 123, previous: 100 }],
        });
        expect(insights).toContainEqual({
            text: "You've spent 23% more on Food than last month",
            tone: "negative",
        });
    });

    test("flags a category that fell significantly vs last month", () => {
        const insights = buildInsights({
            ...baseInput,
            categoryTotals: [{ label: "food", current: 80, previous: 100 }],
        });
        expect(insights).toContainEqual({
            text: "You've spent 20% less on Food than last month",
            tone: "positive",
        });
    });

    test("ignores category changes below the significance threshold", () => {
        const insights = buildInsights({
            ...baseInput,
            categoryTotals: [{ label: "food", current: 105, previous: 100 }],
        });
        expect(insights).toEqual([]);
    });

    test("ignores a category with no prior spending", () => {
        const insights = buildInsights({
            ...baseInput,
            categoryTotals: [{ label: "food", current: 100, previous: 0 }],
        });
        expect(insights).toEqual([]);
    });

    test("only surfaces the biggest mover among several categories", () => {
        const insights = buildInsights({
            ...baseInput,
            categoryTotals: [
                { label: "food", current: 120, previous: 100 },
                { label: "transport", current: 150, previous: 100 },
            ],
        });
        expect(insights).toHaveLength(1);
        expect(insights[0].text).toContain("Transport");
    });

    test("reports a drop in average daily spend", () => {
        const insights = buildInsights({
            ...baseInput,
            currentAvgDailySpend: 39,
            previousAvgDailySpend: 48,
        });
        expect(insights).toContainEqual({
            text: "Your average daily spend dropped from SGD 48.00 to SGD 39.00",
            tone: "positive",
        });
    });

    test("reports a rise in average daily spend", () => {
        const insights = buildInsights({
            ...baseInput,
            currentAvgDailySpend: 48,
            previousAvgDailySpend: 39,
        });
        expect(insights).toContainEqual({
            text: "Your average daily spend rose from SGD 39.00 to SGD 48.00",
            tone: "negative",
        });
    });

    test("ignores a small average daily spend change", () => {
        const insights = buildInsights({
            ...baseInput,
            currentAvgDailySpend: 49,
            previousAvgDailySpend: 48,
        });
        expect(insights).toEqual([]);
    });

    test("projects finishing under budget", () => {
        const insights = buildInsights({
            ...baseInput,
            budget: 1000,
            projectedTotal: 830,
        });
        expect(insights).toContainEqual({
            text: "At your current pace, you'll finish SGD 170.00 under budget",
            tone: "positive",
        });
    });

    test("projects finishing over budget", () => {
        const insights = buildInsights({
            ...baseInput,
            budget: 1000,
            projectedTotal: 1200,
        });
        expect(insights).toContainEqual({
            text: "At your current pace, you'll finish SGD 200.00 over budget",
            tone: "negative",
        });
    });

    test("skips the projection insight when there is no budget set", () => {
        const insights = buildInsights({
            ...baseInput,
            budget: 0,
            projectedTotal: 500,
        });
        expect(insights).toEqual([]);
    });
});
