import { useMemo } from "react";

import { calculatePercentSpent } from "@/lib/stats";
import { useExchangeRates } from "./use-exchange-rates";
import { useMonthlyExpenses } from "./use-monthly-expenses";
import { useProfile } from "./use-profile";

/** This calendar month's budget vs. spend, for the current user. */
export function useMonthlyStats(userId: string | undefined) {
  const { profile, refetch: refetchProfile } = useProfile(userId);
  const { convert } = useExchangeRates();
  const currentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const { expenses, loading, refetch: refetchExpenses } = useMonthlyExpenses(
    userId,
    currentMonth,
  );

  const currency = profile?.currency ?? "SGD";
  const budget = Number(profile?.monthly_budget ?? 0);
  // Almost every expense is already in the profile's current currency (the common
  // case, and free of conversion); only rows from before a currency change differ.
  const totalSpent = expenses.reduce(
    (sum, e) => sum + convert(Number(e.amount), e.currency, currency),
    0,
  );
  const remaining = budget - totalSpent;
  const percentSpent = calculatePercentSpent(totalSpent, budget);

  const refetch = async () => {
    await Promise.all([refetchProfile(), refetchExpenses()]);
  };

  return {
    profile,
    totalSpent,
    remaining,
    percentSpent,
    budget,
    currency,
    loading,
    refetch,
  };
}
