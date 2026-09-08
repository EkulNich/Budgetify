import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type MonthlyExpense = {
  amount: number;
  category: string | null;
  description: string | null;
  created_at: string;
  currency: string;
  group_id: number | null;
};

export function getMonthRange(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return { start: start.toISOString(), end: end.toISOString() };
}

/** Expenses for a single calendar month (local time), most recent data first is not guaranteed. */
export function useMonthlyExpenses(userId: string | undefined, month: Date) {
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { start, end } = getMonthRange(month);
    const { data, error } = await supabase
      .from("expenses")
      .select("amount, category, description, created_at, currency, group_id")
      .eq("user_id", userId)
      .gte("created_at", start)
      .lt("created_at", end);

    if (error) {
      console.error("Failed to load monthly expenses:", error.message);
      setExpenses([]);
    } else {
      setExpenses(data ?? []);
    }
    setLoading(false);
  }, [userId, month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { expenses, loading, refetch };
}
