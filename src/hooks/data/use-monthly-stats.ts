import { useMemo } from "react";

import { calculatePercentSpent } from "@/lib/stats";
import { useMonthlyExpenses } from "./use-monthly-expenses";
import { useProfile } from "./use-profile";

/** This calendar month's budget vs. spend, for the current user. */
export function useMonthlyStats(userId: string | undefined) {
  const { profile, refetch: refetchProfile } = useProfile(userId);
  const currentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const { expenses, loading, refetch: refetchExpenses } = useMonthlyExpenses(
    userId,
    currentMonth,
  );

  const budget = Number(profile?.monthly_budget ?? 0);
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = budget - totalSpent;
  const percentSpent = calculatePercentSpent(totalSpent, budget);

  const refetch = async () => {
    await Promise.all([refetchProfile(), refetchExpenses()]);
  };

  return { profile, totalSpent, remaining, percentSpent, budget, loading, refetch };
}
