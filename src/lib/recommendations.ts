import { parseInsightsResponse, type AiInsight } from "./insights-ai";
import { supabase } from "./supabase";

export type RecommendationExpense = {
    amount: number;
    category: string | null;
    description: string | null;
    createdAt: string;
    isShared: boolean;
};

export type RecommendationsInput = {
    currency: string;
    monthlySalary: number | null;
    monthlyBudget: number;
    daysInMonth: number;
    daysElapsed: number;
    daysRemaining: number;
    currentMonthExpenses: RecommendationExpense[];
    previousMonthExpenses: RecommendationExpense[];
    owedToYou: number;
    owedByYou: number;
};

export const getRecommendations = async (
    input: RecommendationsInput,
): Promise<AiInsight[]> => {
    const { data, error } = await supabase.functions.invoke(
        "get-recommendations",
        { body: input },
    );

    if (error) {
        console.error("Failed to fetch recommendations:", error);
        throw error;
    }

    return parseInsightsResponse(data.text as string);
};
