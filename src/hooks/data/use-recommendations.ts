import { useCallback, useEffect, useState } from "react";

import { isCacheFresh } from "@/lib/cache";
import { getRecommendations } from "@/lib/recommendations";
import { supabase } from "@/lib/supabase";
import { getMonthRange } from "./use-monthly-expenses";

const TIPS_MAX_AGE_HOURS = 24;

/** AI spending tips for the current month, cached in `ai_tips` for a day at a time. */
export function useRecommendations(userId: string | undefined) {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId) {
      setRecommendations([]);
      return;
    }

    const { data: cached } = await supabase
      .from("ai_tips")
      .select("tips, generated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (cached && isCacheFresh(cached.generated_at, TIPS_MAX_AGE_HOURS)) {
      setRecommendations(cached.tips);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_salary, monthly_budget")
      .eq("id", userId)
      .single();
    if (!profile) return;

    const { start, end } = getMonthRange(new Date());
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount,category")
      .eq("user_id", userId)
      .gte("created_at", start)
      .lt("created_at", end);
    if (!expensesData) return;

    setLoading(true);
    try {
      const tips = await getRecommendations(
        Number(profile.monthly_salary),
        Number(profile.monthly_budget),
        expensesData.map((e) => ({ amount: e.amount, category: e.category })),
      );
      setRecommendations(tips);
      await supabase
        .from("ai_tips")
        .upsert(
          { user_id: userId, tips, generated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    } catch (e) {
      console.error("Failed to fetch recommendations:", e);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { recommendations, loading, refetch };
}
