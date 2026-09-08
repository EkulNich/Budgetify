import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type PoolMember = {
  user_id: string;
  username: string;
  contribution_limit: number;
  amount_spent: number;
};

export function usePoolMembers(poolId: number | null) {
  const [members, setMembers] = useState<PoolMember[]>([]);

  const refetch = useCallback(async () => {
    if (!poolId) {
      setMembers([]);
      return;
    }

    const { data: memberData } = await supabase
      .from("group_members")
      .select("user_id, contribution_limit")
      .eq("group_id", poolId);

    if (!memberData) return;

    const userIds = memberData.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    const { data: expenseData, error: expenseError } = await supabase
      .from("group_expenses")
      .select("split_between, split_amounts, amount")
      .eq("group_id", poolId);

    if (expenseError) {
      console.error("Failed to load pool member spend:", expenseError.message);
      return;
    }

    if (profiles) {
      setMembers(
        memberData.map((m) => {
          const spent =
            expenseData?.reduce((sum, e) => {
              if (!e.split_between) return sum;
              if (!e.split_between.includes(m.user_id)) return sum;
              const share = e.split_amounts?.[m.user_id] ?? e.amount / e.split_between.length;
              return sum + share;
            }, 0) ?? 0;
          return {
            user_id: m.user_id,
            username:
              profiles.find((p) => p.id === m.user_id)?.username ?? "Unknown",
            contribution_limit: m.contribution_limit,
            amount_spent: spent,
          };
        }),
      );
    }
  }, [poolId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const invite = useCallback(
    async (friendId: string, contributionLimit: number) => {
      if (!poolId) throw new Error("Cannot invite: no pool selected");
      const { error } = await supabase.from("group_members").insert({
        group_id: poolId,
        user_id: friendId,
        contribution_limit: contributionLimit,
      });
      if (error) {
        console.error("Failed to invite member:", error.message);
        throw error;
      }
      await refetch();
    },
    [poolId, refetch],
  );

  const leave = useCallback(
    async (userId: string) => {
      await supabase
        .from("group_members")
        .delete()
        .eq("group_id", poolId)
        .eq("user_id", userId);
    },
    [poolId],
  );

  return { members, refetch, invite, leave };
}
