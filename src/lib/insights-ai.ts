export const AI_INSIGHT_TYPES = [
    "budget_pace",
    "projected_spending",
    "safe_to_spend",
    "category_spending",
    "spending_spike",
    "unusual_transaction",
    "transaction_frequency",
    "historical_comparison",
    "spending_trend",
    "positive_progress",
    "savings_opportunity",
    "income_vs_spending",
    "recurring_expense",
    "shared_spending",
    "outstanding_balance",
    "spending_concentration",
    "remaining_budget",
] as const;

export type AiInsightType = (typeof AI_INSIGHT_TYPES)[number];
export type AiInsightPriority = "high" | "medium" | "low";

export type AiInsight = {
    type: AiInsightType;
    priority: AiInsightPriority;
    title: string;
    message: string;
};

const PRIORITIES: AiInsightPriority[] = ["high", "medium", "low"];
const MAX_INSIGHTS = 3;

function isValidInsight(value: unknown): value is AiInsight {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;

    return (
        typeof v.type === "string" &&
        (AI_INSIGHT_TYPES as readonly string[]).includes(v.type) &&
        typeof v.priority === "string" &&
        (PRIORITIES as readonly string[]).includes(v.priority) &&
        typeof v.title === "string" &&
        v.title.trim().length > 0 &&
        typeof v.message === "string" &&
        v.message.trim().length > 0
    );
}

/** Parses and validates the Smart Insights model response, dropping any malformed entries and capping at 3. */
export function parseInsightsResponse(text: string): AiInsight[] {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("No JSON object found in insights response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || !Array.isArray(parsed.insights)) {
        throw new Error("Insights response missing an insights array");
    }

    return parsed.insights.filter(isValidInsight).slice(0, MAX_INSIGHTS);
}
