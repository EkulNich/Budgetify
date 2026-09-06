import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Pool = {
  id: number;
  name: string;
  pool_limit: number;
  created_by: string;
  total_spent: number;
};

/** The user's group pools, each with its total spent so far. */
export function usePools(userId: string | undefined) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setPools([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) {
      setPools([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);

    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, pool_limit, created_by")
      .in("id", groupIds);

    if (!groups) {
      setLoading(false);
      return;
    }

    const { data: expenses } = await supabase
      .from("group_expenses")
      .select("group_id, amount")
      .in("group_id", groupIds);

    const totalsByGroup: Record<number, number> = {};
    for (const expense of expenses ?? []) {
      totalsByGroup[expense.group_id] =
        (totalsByGroup[expense.group_id] ?? 0) + expense.amount;
    }

    setPools(
      groups.map((g) => ({ ...g, total_spent: totalsByGroup[g.id] ?? 0 })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { pools, loading, refetch };
}

export async function createPool(
  userId: string,
  name: string,
  limit: number,
) {
  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, created_by: userId, pool_limit: limit })
    .select()
    .single();

  if (error || !group) {
    throw error ?? new Error("Failed to create pool");
  }

  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    contribution_limit: limit,
  });
}
