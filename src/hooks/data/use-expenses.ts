import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Expense = {
  id: string;
  amount: number;
  category: string | null;
  description: string | null;
  created_at: string;
  currency: string;
  /** Set when this row was mirrored from a group pool expense — null for a genuine personal expense. */
  group_id: number | null;
};

/** All of the user's expenses, most recent first. */
export function useExpenses(userId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("id,amount,category,description,created_at,currency,group_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch expenses:", error);
      setExpenses([]);
    } else {
      setExpenses(data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
      if (error) {
        console.error("Failed to delete expense:", error.message);
        throw error;
      }
      await refetch();
    },
    [refetch],
  );

  return { expenses, loading, refetch, deleteExpense };
}

/** Inserts a new personal expense for the given user. `amount` must already be in `currency`. */
export async function insertExpense(
  userId: string,
  input: {
    amount: number;
    currency: string;
    category: string;
    description: string | null;
    /** Overrides the row's created_at (e.g. a scanned receipt's printed date). Defaults to now. */
    createdAt?: string;
  },
) {
  const { createdAt, ...rest } = input;
  const { error } = await supabase.from("expenses").insert([
    {
      ...rest,
      user_id: userId,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  ]);
  if (error) throw error;
}
