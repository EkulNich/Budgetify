import { formatCurrency } from "./format";

export type Insight = { text: string; tone: "positive" | "negative" | "neutral" };

const CATEGORY_CHANGE_THRESHOLD = 10;
const AVG_SPEND_CHANGE_THRESHOLD = 5;

type CategoryComparison = { label: string; current: number; previous: number };

/** Auto-generated highlights for the stats page: biggest category mover, daily-pace change, and budget projection. */
export function buildInsights(input: {
    categoryTotals: CategoryComparison[];
    currentAvgDailySpend: number;
    previousAvgDailySpend: number;
    projectedTotal: number;
    budget: number;
    currency: string;
}): Insight[] {
    const {
        categoryTotals,
        currentAvgDailySpend,
        previousAvgDailySpend,
        projectedTotal,
        budget,
        currency,
    } = input;
    const insights: Insight[] = [];

    let biggest: { label: string; change: number } | null = null;
    for (const { label, current, previous } of categoryTotals) {
        if (previous <= 0 || current <= 0) continue;
        const change = ((current - previous) / previous) * 100;
        if (Math.abs(change) < CATEGORY_CHANGE_THRESHOLD) continue;
        if (!biggest || Math.abs(change) > Math.abs(biggest.change)) {
            biggest = { label, change };
        }
    }
    if (biggest) {
        const direction = biggest.change > 0 ? "more" : "less";
        const label = biggest.label.charAt(0).toUpperCase() + biggest.label.slice(1);
        insights.push({
            text: `You've spent ${Math.abs(Math.round(biggest.change))}% ${direction} on ${label} than last month`,
            tone: biggest.change > 0 ? "negative" : "positive",
        });
    }

    if (previousAvgDailySpend > 0 && currentAvgDailySpend > 0) {
        const changePercent =
            ((currentAvgDailySpend - previousAvgDailySpend) / previousAvgDailySpend) * 100;
        if (Math.abs(changePercent) >= AVG_SPEND_CHANGE_THRESHOLD) {
            const direction = changePercent > 0 ? "rose" : "dropped";
            insights.push({
                text: `Your average daily spend ${direction} from ${formatCurrency(previousAvgDailySpend, currency)} to ${formatCurrency(currentAvgDailySpend, currency)}`,
                tone: changePercent > 0 ? "negative" : "positive",
            });
        }
    }

    if (budget > 0) {
        const diff = budget - projectedTotal;
        insights.push(
            diff >= 0
                ? {
                      text: `At your current pace, you'll finish ${formatCurrency(diff, currency)} under budget`,
                      tone: "positive",
                  }
                : {
                      text: `At your current pace, you'll finish ${formatCurrency(-diff, currency)} over budget`,
                      tone: "negative",
                  },
        );
    }

    return insights;
}
