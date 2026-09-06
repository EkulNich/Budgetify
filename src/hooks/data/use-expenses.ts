import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Expense = {
  id: string;
  amount: number;
  category: string | null;
  description: string | null;
  created_at: string;
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
      .select("id,amount,category,description,created_at")
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
      await supabase.from("expenses").delete().eq("id", expenseId);
      await refetch();
    },
    [refetch],
  );

  return { expenses, loading, refetch, deleteExpense };
}

/** Inserts a new personal expense for the given user. */
export async function insertExpense(
  userId: string,
  input: { amount: number; category: string; description: string | null },
) {
  const { error } = await supabase
    .from("expenses")
    .insert([{ ...input, user_id: userId }]);
  if (error) throw error;
}
