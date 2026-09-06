import { describe, expect, test } from "@jest/globals";
import { dateToIsoTimestamp, parseReceiptResponse } from "../src/lib/receipt";

describe("parseReceiptResponse", () => {
    test("parses a clean JSON response", () => {
        const text = '{"amount": 45.67, "description": "Trader Joe\'s", "date": "2026-06-25"}';
        expect(parseReceiptResponse(text)).toEqual({
            amount: 45.67,
            description: "Trader Joe's",
            date: "2026-06-25",
            items: [],
        });
    });

    test("strips markdown code fences and surrounding text", () => {
        const text = 'Here you go:\n```json\n{"amount": 12, "description": "Cafe", "date": "2026-01-05"}\n```';
        expect(parseReceiptResponse(text)).toEqual({
            amount: 12,
            description: "Cafe",
            date: "2026-01-05",
            items: [],
        });
    });

    test("coerces a string amount with a currency symbol", () => {
        const text = '{"amount": "$1,234.56", "description": "Store", "date": "2026-03-01"}';
        expect(parseReceiptResponse(text).amount).toBeCloseTo(1234.56, 2);
    });

    test("returns null amount when it cannot be parsed", () => {
        const text = '{"amount": null, "description": "Unclear receipt", "date": null}';
        const result = parseReceiptResponse(text);
        expect(result.amount).toBeNull();
        expect(result.date).toBeNull();
    });

    test("rejects a malformed date and returns null instead", () => {
        const text = '{"amount": 10, "description": "Shop", "date": "June 25 2026"}';
        expect(parseReceiptResponse(text).date).toBeNull();
    });

    test("treats an empty description as null", () => {
        const text = '{"amount": 10, "description": "", "date": null}';
        expect(parseReceiptResponse(text).description).toBeNull();
    });

    test("throws when no JSON object is present", () => {
        expect(() => parseReceiptResponse("I could not read this receipt.")).toThrow();
    });

    test("parses a valid items array", () => {
        const text = `{"amount": 20, "description": "Store", "date": "2026-06-25",
            "items": [{"name": "Bananas", "price": 3.49}, {"name": "Bread", "price": 5.99}]}`;
        expect(parseReceiptResponse(text).items).toEqual([
            { name: "Bananas", price: 3.49 },
            { name: "Bread", price: 5.99 },
        ]);
    });

    test("coerces a string item price with a currency symbol", () => {
        const text = '{"amount": 10, "description": "Store", "date": null, "items": [{"name": "Milk", "price": "$4.29"}]}';
        expect(parseReceiptResponse(text).items[0].price).toBeCloseTo(4.29, 2);
    });

    test("drops items missing a name or a parseable price", () => {
        const text = `{"amount": 10, "description": "Store", "date": null,
            "items": [{"name": "", "price": 5}, {"name": "Chips"}, {"price": 3}, {"name": "Soda", "price": 2.5}]}`;
        expect(parseReceiptResponse(text).items).toEqual([{ name: "Soda", price: 2.5 }]);
    });

    test("defaults items to an empty array when missing or malformed", () => {
        const text = '{"amount": 10, "description": "Store", "date": null, "items": "not an array"}';
        expect(parseReceiptResponse(text).items).toEqual([]);

        const textNoItems = '{"amount": 10, "description": "Store", "date": null}';
        expect(parseReceiptResponse(textNoItems).items).toEqual([]);
    });
});

describe("dateToIsoTimestamp", () => {
    test("converts a bare date into a midnight UTC ISO timestamp", () => {
        expect(dateToIsoTimestamp("2026-06-25")).toBe("2026-06-25T00:00:00.000Z");
    });
});
