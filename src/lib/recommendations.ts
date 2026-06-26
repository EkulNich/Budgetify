import { supabase } from "./supabase";

export const getRecommendations = async (
    salary: number,
    budget: number,
    expenses: { amount: number; category: string | null }[],
): Promise<string[]> => {
    const { data, error } = await supabase.functions.invoke(
        "get-recommendations",
        { body: { salary, budget, expenses } },
    );

    if (error) {
        console.error("Failed to fetch recommendations:", error);
        throw error;
    }

    return data.recommendations as string[];
};
