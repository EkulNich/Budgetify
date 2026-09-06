import { formatCurrency } from "../src/lib/format";
import { describe, expect, test } from "@jest/globals";

describe("formatCurrency", () => {
    test("formats a small number with two decimals", () => {
        expect(formatCurrency(5)).toBe("5.00");
    });

    test("formats a thousand with a comma", () => {
        expect(formatCurrency(1000)).toBe("1,000.00");
    });

    test("formats a million with commas", () => {
        expect(formatCurrency(1000000)).toBe("1,000,000.00");
    });

    test("keeps two decimal places", () => {
        expect(formatCurrency(1234.5)).toBe("1,234.50");
    });

    test("rounds to two decimals", () => {
        expect(formatCurrency(1234.567)).toBe("1,234.57");
    });

    test("formats zero", () => {
        expect(formatCurrency(0)).toBe("0.00");
    });

    test("formats negative numbers", () => {
        expect(formatCurrency(-1500)).toBe("-1,500.00");
    });

    test("prefixes a currency code when given one", () => {
        expect(formatCurrency(1234.5, "SGD")).toBe("SGD 1,234.50");
    });

    test("differentiates currency codes for the same symbol-equivalent amount", () => {
        expect(formatCurrency(100, "USD")).toBe("USD 100.00");
        expect(formatCurrency(100, "SGD")).toBe("SGD 100.00");
    });
});
