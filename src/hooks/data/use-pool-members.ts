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
    const { data: expenseData } = await supabase
      .from("group_expenses")
      .select("split_between, amount")
      .eq("group_id", poolId);

    if (profiles) {
      setMembers(
        memberData.map((m) => {
          const spent =
            expenseData?.reduce((sum, e) => {
              if (!e.split_between) return sum;
              if (e.split_between.includes(m.user_id)) {
                return sum + e.amount / e.split_between.length;
              }
              return sum;
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
      await supabase.from("group_members").insert({
        group_id: poolId,
        user_id: friendId,
        contribution_limit: contributionLimit,
      });
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
