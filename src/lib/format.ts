export function formatCurrency(n: number, currencyCode?: string): string {
    const [whole, decimal] = n.toFixed(2).split(".");
    const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + decimal;
    return currencyCode ? `${currencyCode} ${formatted}` : formatted;
}

/** Extracts the "YYYY-MM-DD" date portion from a Postgres timestamp like "2026-06-25 10:50:32.710308+00". */
export function extractDateOnly(createdAt: string): string {
    return createdAt.slice(0, 10);
}

/** Formats a "YYYY-MM-DD" (or full timestamp) into a short display date, e.g. "Jun 25, 2026". */
export function formatExpenseDate(createdAt: string): string {
    const date = new Date(extractDateOnly(createdAt) + "T00:00:00");
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
