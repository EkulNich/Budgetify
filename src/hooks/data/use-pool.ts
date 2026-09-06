import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Pool = {
  id: number;
  name: string;
  pool_limit: number;
  created_by: string;
  currency: string;
};

export function usePool(poolId: number) {
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("id", poolId)
      .single();
    if (data) setPool(data);
    setLoading(false);
  }, [poolId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const rename = useCallback(
    async (newName: string) => {
      const oldName = pool?.name ?? "";
      await supabase.from("groups").update({ name: newName }).eq("id", poolId);

      const { error } = await supabase.rpc("rename_group_expenses", {
        p_old_name: oldName,
        p_new_name: newName,
      });
      if (error) {
        console.error("Failed to rename group expenses:", error.message);
      }

      setPool((prev) => (prev ? { ...prev, name: newName } : prev));
    },
    [poolId, pool?.name],
  );

  return { pool, loading, refetch, rename };
}

/** Accepted friends of the current user, for the "invite a friend" picker. */
export function useAcceptedFriendProfiles(userId: string | undefined) {
  const [friends, setFriends] = useState<{ id: string; username: string }[]>(
    [],
  );

  const refetch = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      return;
    }

    const { data } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted");
    if (!data) return;

    const friendIds = data.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id,
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", friendIds);
    setFriends(profiles ?? []);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { friends, refetch };
}
