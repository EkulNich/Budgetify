import { describe, expect, test } from "@jest/globals";
import { convertAmount, type ExchangeRates } from "../src/lib/currency";

const rates: ExchangeRates = {
    base: "USD",
    rates: { SGD: 1.35, EUR: 0.92 },
};

describe("convertAmount", () => {
    test("same currency is a passthrough", () => {
        expect(convertAmount(50, "USD", "USD", rates)).toBe(50);
        expect(convertAmount(50, "SGD", "SGD", rates)).toBe(50);
    });

    test("converts from the base currency", () => {
        expect(convertAmount(100, "USD", "SGD", rates)).toBeCloseTo(135, 5);
    });

    test("converts to the base currency", () => {
        expect(convertAmount(135, "SGD", "USD", rates)).toBeCloseTo(100, 5);
    });

    test("cross-converts between two non-base currencies via the base", () => {
        expect(convertAmount(100, "SGD", "EUR", rates)).toBeCloseTo(68.148, 3);
    });

    test("throws for an unrecognized 'from' currency", () => {
        expect(() => convertAmount(100, "XXX", "USD", rates)).toThrow();
    });

    test("throws for an unrecognized 'to' currency", () => {
        expect(() => convertAmount(100, "USD", "XXX", rates)).toThrow();
    });
});
