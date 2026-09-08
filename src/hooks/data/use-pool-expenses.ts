import { useCallback, useEffect, useState } from "react";

import { wouldOrphanSettlement } from "@/lib/settlements";
import { supabase } from "@/lib/supabase";

export type PoolExpense = {
  id: number;
  amount: number;
  description: string;
  created_at: string;
  added_by: string;
  added_by_username: string;
  split_between: string[] | null;
  split_amounts: Record<string, number> | null;
  split_usernames: string[];
  category: string | null;
  currency: string;
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
        "id, amount, description, created_at, added_by, split_between, split_amounts, category, currency",
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
          split_amounts: e.split_amounts ?? null,
          split_usernames: (e.split_between ?? []).map(
            (uid: string) =>
              profiles.find((p) => p.id === uid)?.username ?? "Unknown",
          ),
          category: e.category,
          currency: e.currency,
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
      /** Already converted into the pool's currency — see `currency`. */
      amount: number;
      currency: string;
      description: string;
      targets: string[];
      /**
       * Per-target share for a custom (exact-amount or percentage) split.
       * Omit for an equal split — each target gets `amount / targets.length`.
       */
      splitAmounts?: Record<string, number>;
      /** Overrides created_at (e.g. a scanned receipt's printed date). Defaults to now. */
      createdAt?: string;
    }) => {
      if (!poolId) throw new Error("Cannot add expense: no pool selected");
      const equalShare = input.amount / input.targets.length;
      const shareFor = (userId: string) => input.splitAmounts?.[userId] ?? equalShare;

      const { error: insertError } = await supabase.from("group_expenses").insert({
        group_id: poolId,
        added_by: input.userId,
        amount: input.amount,
        description: input.description,
        split_between: input.targets,
        split_amounts: input.splitAmounts ?? null,
        category: input.category,
        currency: input.currency,
        ...(input.createdAt ? { created_at: input.createdAt } : {}),
      });
      if (insertError) {
        console.error("Failed to add pool expense:", insertError.message);
        throw insertError;
      }

      for (const userId of input.targets) {
        const { error: mirrorError } = await supabase.rpc("insert_expense_for_user", {
          p_user_id: userId,
          p_amount: shareFor(userId),
          p_category: input.category,
          p_description: input.description,
          p_group_id: poolId,
          p_currency: input.currency,
          p_created_at: input.createdAt ?? null,
        });
        if (mirrorError) {
          console.error("Failed to mirror personal expense:", mirrorError.message);
          throw mirrorError;
        }
      }

      await refetch();
    },
    [poolId, refetch],
  );

  const deleteExpense = useCallback(
    async (expense: PoolExpense, fallbackCategory: string) => {
      if (!poolId) throw new Error("Cannot delete expense: no pool selected");

      const [{ data: allExpenses }, { data: allSettlements }] = await Promise.all([
        supabase
          .from("group_expenses")
          .select("id, amount, added_by, split_between, split_amounts")
          .eq("group_id", poolId),
        supabase
          .from("settlements")
          .select("from_user, to_user, amount")
          .eq("group_id", poolId),
      ]);

      const expenseRecord = (allExpenses ?? []).find((e) => e.id === expense.id);
      if (
        expenseRecord &&
        wouldOrphanSettlement(expenseRecord, allExpenses ?? [], allSettlements ?? [])
      ) {
        throw new Error(
          "This expense can't be deleted — a settlement has already been made based on it. Deleting it would incorrectly change who owes whom.",
        );
      }

      const { error: deleteError } = await supabase
        .from("group_expenses")
        .delete()
        .eq("id", expense.id);
      if (deleteError) {
        console.error("Failed to delete pool expense:", deleteError.message);
        throw deleteError;
      }

      // Older rows (added before categories existed) have no stored category —
      // they were mirrored into personal expenses under the pool's name instead.
      const category = expense.category ?? fallbackCategory;

      const targets = expense.split_between ?? [expense.added_by];
      for (const userId of targets) {
        const { error: mirrorError } = await supabase.rpc("delete_expense_for_user", {
          p_user_id: userId,
          p_description: expense.description,
          p_category: category,
          p_group_id: poolId,
        });
        if (mirrorError) {
          console.error("Failed to delete mirrored personal expense:", mirrorError.message);
          throw mirrorError;
        }
      }

      await refetch();
    },
    [poolId, refetch],
  );

  return { expenses, refetch, addExpense, deleteExpense };
}
