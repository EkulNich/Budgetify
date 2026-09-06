import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type PoolExpense = {
  id: number;
  amount: number;
  description: string;
  created_at: string;
  added_by: string;
  added_by_username: string;
  split_between: string[] | null;
  split_usernames: string[];
  category: string | null;
};

export function usePoolExpenses(poolId: number | null) {
  const [expenses, setExpenses] = useState<PoolExpense[]>([]);

  const refetch = useCallback(async () => {
    if (!poolId) {
      setExpenses([]);
      return;
    }

    const { data: expenseData } = await supabase
      .from("group_expenses")
      .select(
        "id, amount, description, created_at, added_by, split_between, category",
      )
      .eq("group_id", poolId)
      .order("created_at", { ascending: false });

    if (!expenseData) return;

    const allUserIds = [
      ...new Set([
        ...expenseData.map((e) => e.added_by).filter(Boolean),
        ...expenseData.flatMap((e) => e.split_between ?? []),
      ]),
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", allUserIds);

    if (profiles) {
      setExpenses(
        expenseData.map((e) => ({
          id: e.id,
          amount: e.amount,
          description: e.description,
          created_at: e.created_at,
          added_by: e.added_by,
          added_by_username:
            profiles.find((p) => p.id === e.added_by)?.username ?? "Unknown",
          split_between: e.split_between,
          split_usernames: (e.split_between ?? []).map(
            (uid: string) =>
              profiles.find((p) => p.id === uid)?.username ?? "Unknown",
          ),
          category: e.category,
        })),
      );
    }
  }, [poolId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addExpense = useCallback(
    async (input: {
      userId: string;
      category: string;
      amount: number;
      description: string;
      targets: string[];
    }) => {
      if (!poolId) throw new Error("Cannot add expense: no pool selected");
      const splitAmount = input.amount / input.targets.length;

      await supabase.from("group_expenses").insert({
        group_id: poolId,
        added_by: input.userId,
        amount: input.amount,
        description: input.description,
        split_between: input.targets,
        category: input.category,
      });

      for (const userId of input.targets) {
        await supabase.rpc("insert_expense_for_user", {
          p_user_id: userId,
          p_amount: splitAmount,
          p_category: input.category,
          p_description: input.description,
        });
      }

      await refetch();
    },
    [poolId, refetch],
  );

  const deleteExpense = useCallback(
    async (expense: PoolExpense, fallbackCategory: string) => {
      await supabase.from("group_expenses").delete().eq("id", expense.id);

      // Older rows (added before categories existed) have no stored category —
      // they were mirrored into personal expenses under the pool's name instead.
      const category = expense.category ?? fallbackCategory;

      const targets = expense.split_between ?? [expense.added_by];
      for (const userId of targets) {
        await supabase.rpc("delete_expense_for_user", {
          p_user_id: userId,
          p_description: expense.description,
          p_category: category,
        });
      }

      await refetch();
    },
    [poolId, refetch],
  );

  return { expenses, refetch, addExpense, deleteExpense };
}
