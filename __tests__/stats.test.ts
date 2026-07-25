declare const describe: any;
declare const test: any;
declare const expect: any;

import { calculatePercentSpent } from "../src/lib/stats";

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
