import { extractDateOnly } from "./format";

export function calculatePercentSpent(
    totalSpent: number,
    budget: number,
): number {
    if (budget <= 0) return 0;
    return (totalSpent / budget) * 100;
}

export type DailyAmount = { day: number; amount: number };

/** Cumulative amount spent by each day of the month (day 1..daysInMonth). */
export function buildDailyCumulativeSeries(
    expenses: { amount: number; created_at: string }[],
    daysInMonth: number,
): DailyAmount[] {
    const dailyTotals = new Array(daysInMonth + 1).fill(0);

    for (const expense of expenses) {
        const day = Number(extractDateOnly(expense.created_at).slice(8, 10));
        if (day >= 1 && day <= daysInMonth) {
            dailyTotals[day] += expense.amount;
        }
    }

    const series: DailyAmount[] = [];
    let running = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        running += dailyTotals[day];
        series.push({ day, amount: running });
    }
    return series;
}

/** A straight line from $0 to the full budget, spread evenly across the month. */
export function buildBudgetTrajectory(
    budget: number,
    daysInMonth: number,
): DailyAmount[] {
    const series: DailyAmount[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
        series.push({ day, amount: (budget / daysInMonth) * day });
    }
    return series;
}

/** Projects the full month's spending by extrapolating the current daily pace. */
export function calculateProjectedSpending(
    totalSpent: number,
    daysElapsed: number,
    daysInMonth: number,
): number {
    if (daysElapsed <= 0) return 0;
    return (totalSpent / daysElapsed) * daysInMonth;
}

/** How much can still be spent per remaining day without exceeding the budget. */
export function calculateSafeDailySpend(
    remaining: number,
    daysRemaining: number,
): number {
    return remaining / Math.max(daysRemaining, 1);
}

export function calculateAverageDailySpend(
    totalSpent: number,
    daysElapsed: number,
): number {
    return totalSpent / Math.max(daysElapsed, 1);
}

/** Percent change vs. last month, or null when last month had no spending to compare against. */
export function calculateCategoryChangePercent(
    current: number,
    previous: number,
): number | null {
    if (previous <= 0) return null;
    return ((current - previous) / previous) * 100;
}
