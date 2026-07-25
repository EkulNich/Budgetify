export function calculatePercentSpent(
    totalSpent: number,
    budget: number,
): number {
    if (budget <= 0) return 0;
    return (totalSpent / budget) * 100;
}
