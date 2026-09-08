import { useCallback, useEffect, useMemo, useState } from "react";

import { isCacheFresh } from "@/lib/cache";
import type { AiInsight } from "@/lib/insights-ai";
import { getRecommendations, type RecommendationExpense } from "@/lib/recommendations";
import { supabase } from "@/lib/supabase";
import { useBalancesSummary } from "./use-balances-summary";
import { useExchangeRates } from "./use-exchange-rates";
import { useMonthlyExpenses, type MonthlyExpense } from "./use-monthly-expenses";
import { useProfile } from "./use-profile";

const TIPS_MAX_AGE_HOURS = 24;

function daysInMonthOf(month: Date): number {
    return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
}

function toRecommendationExpenses(
    expenses: MonthlyExpense[],
    convert: (amount: number, from: string, to: string) => number,
    currency: string,
): RecommendationExpense[] {
    return expenses.map((e) => ({
        amount: convert(Number(e.amount) || 0, e.currency, currency),
        category: e.category,
        description: e.description,
        createdAt: e.created_at,
        isShared: e.group_id !== null,
    }));
}

/** AI Smart Insights for the current month, cached in `ai_tips` for a day at a time. */
export function useRecommendations(userId: string | undefined) {
    const [recommendations, setRecommendations] = useState<AiInsight[]>([]);
    const [loading, setLoading] = useState(false);

    const { profile } = useProfile(userId);
    const { convert } = useExchangeRates();
    const currency = profile?.currency ?? "SGD";
    const { owedToYou, owedByYou } = useBalancesSummary(userId, currency, convert);

    // Stable Date references — `useMonthlyExpenses` keys its own refetch on
    // these by identity, so recomputing fresh ones every render would loop.
    const today = useMemo(() => new Date(), []);
    const currentMonth = useMemo(
        () => new Date(today.getFullYear(), today.getMonth(), 1),
        [today],
    );
    const previousMonth = useMemo(
        () => new Date(today.getFullYear(), today.getMonth() - 1, 1),
        [today],
    );
    const { expenses: currentMonthExpenses } = useMonthlyExpenses(userId, currentMonth);
    const { expenses: previousMonthExpenses } = useMonthlyExpenses(userId, previousMonth);

    const refetch = useCallback(async () => {
        if (!userId || !profile) {
            setRecommendations([]);
            return;
        }

        const { data: cached } = await supabase
            .from("ai_tips")
            .select("tips, generated_at")
            .eq("user_id", userId)
            .maybeSingle();

        if (cached && isCacheFresh(cached.generated_at, TIPS_MAX_AGE_HOURS)) {
            setRecommendations(cached.tips ?? []);
            return;
        }

        setLoading(true);
        try {
            const daysInMonth = daysInMonthOf(currentMonth);
            const daysElapsed = today.getDate();
            const daysRemaining = daysInMonth - daysElapsed + 1;

            const insights = await getRecommendations({
                currency,
                monthlySalary: profile.monthly_salary,
                monthlyBudget: Number(profile.monthly_budget ?? 0),
                daysInMonth,
                daysElapsed,
                daysRemaining,
                currentMonthExpenses: toRecommendationExpenses(
                    currentMonthExpenses,
                    convert,
                    currency,
                ),
                previousMonthExpenses: toRecommendationExpenses(
                    previousMonthExpenses,
                    convert,
                    currency,
                ),
                owedToYou: owedToYou.reduce((sum, b) => sum + b.amount, 0),
                owedByYou: owedByYou.reduce((sum, b) => sum + b.amount, 0),
            });

            setRecommendations(insights);
            await supabase.from("ai_tips").upsert(
                { user_id: userId, tips: insights, generated_at: new Date().toISOString() },
                { onConflict: "user_id" },
            );
        } catch (e) {
            console.error("Failed to fetch recommendations:", e);
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, profile, currentMonthExpenses, previousMonthExpenses, owedToYou, owedByYou]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { recommendations, loading, refetch };
}
