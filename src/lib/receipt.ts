export type ScannedReceipt = {
    amount: number | null;
    description: string | null;
    /** "YYYY-MM-DD", or null if not found/valid. */
    date: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses the raw text Gemini returned for a scanned receipt into a validated
 * shape. Tolerant of markdown code fences and stray text around the JSON
 * object, and of the amount coming back as a string (e.g. "$45.67").
 */
export function parseReceiptResponse(text: string): ScannedReceipt {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("No JSON object found in receipt scan response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    let amount: number | null = null;
    if (typeof parsed.amount === "number" && !Number.isNaN(parsed.amount)) {
        amount = parsed.amount;
    } else if (typeof parsed.amount === "string") {
        const cleaned = parseFloat(parsed.amount.replace(/[^0-9.-]/g, ""));
        amount = Number.isNaN(cleaned) ? null : cleaned;
    }

    const description =
        typeof parsed.description === "string" && parsed.description.trim()
            ? parsed.description.trim().slice(0, 40)
            : null;

    const date =
        typeof parsed.date === "string" && DATE_PATTERN.test(parsed.date)
            ? parsed.date
            : null;

    return { amount, description, date };
}

/** Converts a "YYYY-MM-DD" date into an ISO timestamp suitable for a `created_at` column. */
export function dateToIsoTimestamp(date: string): string {
    return `${date}T00:00:00.000Z`;
}
