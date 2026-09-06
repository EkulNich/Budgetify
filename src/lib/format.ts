export function formatCurrency(n: number, currencyCode?: string): string {
    const [whole, decimal] = n.toFixed(2).split(".");
    const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + decimal;
    return currencyCode ? `${currencyCode} ${formatted}` : formatted;
}
