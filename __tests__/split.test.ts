declare const describe: any;
declare const test: any;
declare const expect: any;

import {
    calculateSplitAmounts,
    validateExactSplit,
    validatePercentageSplit,
} from "../src/lib/split";

const ALICE = "alice";
const BOB = "bob";
const CARL = "carl";

describe("calculateSplitAmounts", () => {
    test("equal mode divides evenly", () => {
        const result = calculateSplitAmounts(90, [ALICE, BOB, CARL], "equal", {}, {});
        expect(result).toEqual({ alice: 30, bob: 30, carl: 30 });
    });

    test("exact mode uses the entered amounts directly", () => {
        const result = calculateSplitAmounts(
            100,
            [ALICE, BOB],
            "exact",
            { alice: "60", bob: "40" },
            {},
        );
        expect(result).toEqual({ alice: 60, bob: 40 });
    });

    test("exact mode treats a missing entry as 0", () => {
        const result = calculateSplitAmounts(100, [ALICE, BOB], "exact", { alice: "60" }, {});
        expect(result).toEqual({ alice: 60, bob: 0 });
    });

    test("percentage mode converts each percentage of the total", () => {
        const result = calculateSplitAmounts(
            200,
            [ALICE, BOB],
            "percentage",
            {},
            { alice: "25", bob: "75" },
        );
        expect(result).toEqual({ alice: 50, bob: 150 });
    });

    test("percentage mode treats a missing entry as 0%", () => {
        const result = calculateSplitAmounts(
            200,
            [ALICE, BOB],
            "percentage",
            {},
            { alice: "100" },
        );
        expect(result).toEqual({ alice: 200, bob: 0 });
    });
});

describe("validateExactSplit", () => {
    test("valid when entries sum exactly to the total", () => {
        const result = validateExactSplit(100, [ALICE, BOB], { alice: "60", bob: "40" });
        expect(result.valid).toBe(true);
        expect(result.total).toBe(100);
        expect(result.remaining).toBe(0);
    });

    test("invalid when entries sum to less than the total", () => {
        const result = validateExactSplit(100, [ALICE, BOB], { alice: "60", bob: "30" });
        expect(result.valid).toBe(false);
        expect(result.remaining).toBeCloseTo(10);
    });

    test("invalid when entries sum to more than the total", () => {
        const result = validateExactSplit(100, [ALICE, BOB], { alice: "60", bob: "50" });
        expect(result.valid).toBe(false);
        expect(result.remaining).toBeCloseTo(-10);
    });

    test("tolerates a sub-cent floating point difference", () => {
        const result = validateExactSplit(10, [ALICE, BOB, CARL], {
            alice: "3.33",
            bob: "3.33",
            carl: "3.34",
        });
        expect(result.valid).toBe(true);
    });
});

describe("validatePercentageSplit", () => {
    test("valid when percentages sum to exactly 100", () => {
        const result = validatePercentageSplit([ALICE, BOB], { alice: "40", bob: "60" });
        expect(result.valid).toBe(true);
        expect(result.remaining).toBe(0);
    });

    test("invalid when percentages don't sum to 100", () => {
        const result = validatePercentageSplit([ALICE, BOB], { alice: "40", bob: "50" });
        expect(result.valid).toBe(false);
        expect(result.remaining).toBeCloseTo(10);
    });

    test("tolerates a sub-cent floating point difference", () => {
        const result = validatePercentageSplit([ALICE, BOB, CARL], {
            alice: "33.33",
            bob: "33.33",
            carl: "33.34",
        });
        expect(result.valid).toBe(true);
    });
});
