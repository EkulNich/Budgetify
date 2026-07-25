export function formatCurrency(n: number): string {
    const [whole, decimal] = n.toFixed(2).split(".");
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + decimal;
}
