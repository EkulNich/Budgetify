export type ReceiptItem = {
    name: string;
    price: number;
};

export type ScannedReceipt = {
    amount: number | null;
    description: string | null;
    /** "YYYY-MM-DD", or null if not found/valid. */
    date: string | null;
    /** Individual line items, if any could be read off the receipt. */
    items: ReceiptItem[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function coerceAmount(value: unknown): number | null {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
        const cleaned = parseFloat(value.replace(/[^0-9.-]/g, ""));
        return Number.isNaN(cleaned) ? null : cleaned;
    }
    return null;
}

function coerceItems(value: unknown): ReceiptItem[] {
    if (!Array.isArray(value)) return [];

    const items: ReceiptItem[] = [];
    for (const entry of value) {
        if (!entry || typeof entry !== "object") continue;
        const name =
            typeof (entry as { name?: unknown }).name === "string"
                ? (entry as { name: string }).name.trim().slice(0, 60)
                : "";
        const price = coerceAmount((entry as { price?: unknown }).price);
        if (name && price !== null) {
            items.push({ name, price });
        }
    }
    return items;
}

/**
 * Parses the raw text Gemini returned for a scanned receipt into a validated
 * shape. Tolerant of markdown code fences and stray text around the JSON
 * object, of amounts coming back as strings (e.g. "$45.67"), and of a missing
 * or malformed `items` array (an item missing a name or price is dropped).
 */
export function parseReceiptResponse(text: string): ScannedReceipt {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("No JSON object found in receipt scan response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const amount = coerceAmount(parsed.amount);

    const description =
        typeof parsed.description === "string" && parsed.description.trim()
            ? parsed.description.trim().slice(0, 40)
            : null;

    const date =
        typeof parsed.date === "string" && DATE_PATTERN.test(parsed.date)
            ? parsed.date
            : null;

    const items = coerceItems(parsed.items);

    return { amount, description, date, items };
}

/** Converts a "YYYY-MM-DD" date into an ISO timestamp suitable for a `created_at` column. */
export function dateToIsoTimestamp(date: string): string {
    return `${date}T00:00:00.000Z`;
}
