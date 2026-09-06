import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Friend = {
  id: string;
  username: string;
  streak_count: number;
  friendship_id: string;
  budget_percent_used: number;
};

export type PendingRequest = {
  id: string;
  requester_id: string;
  username: string;
};

export type FriendSearchResult = {
  id: string;
  username: string;
  streak_count: number;
};

/** Accepted friends and incoming pending requests, kept live via a Realtime subscription. */
export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id")
      .eq("status", "accepted");

    if (error || !data) {
      setLoading(false);
      return;
    }

    const friendIds = data.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id,
    );
    const friendshipMap = data.reduce(
      (acc, f) => {
        const fid = f.requester_id === userId ? f.addressee_id : f.requester_id;
        acc[fid] = f.id;
        return acc;
      },
      {} as Record<string, string>,
    );

    if (friendIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, streak_count, budget_percent_used")
      .in("id", friendIds);

    if (profiles) {
      setFriends(
        profiles.map((p) => ({
          id: p.id,
          username: p.username,
          streak_count: p.streak_count ?? 0,
          friendship_id: friendshipMap[p.id],
          budget_percent_used: p.budget_percent_used ?? 0,
        })),
      );
    }
    setLoading(false);
  }, [userId]);

  const fetchPendingRequests = useCallback(async () => {
    if (!userId) {
      setPendingRequests([]);
      return;
    }

    const { data, error } = await supabase
      .from("friendships")
      .select("id, requester_id")
      .eq("addressee_id", userId)
      .eq("status", "pending");

    if (error || !data) return;

    const requesterIds = data.map((r) => r.requester_id);
    if (requesterIds.length === 0) {
      setPendingRequests([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", requesterIds);

    if (profiles) {
      setPendingRequests(
        data.map((r) => ({
          id: r.id,
          requester_id: r.requester_id,
          username:
            profiles.find((p) => p.id === r.requester_id)?.username ??
            "Unknown",
        })),
      );
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchFriends();
    fetchPendingRequests();

    const channel = supabase
      .channel("friendships_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          fetchFriends();
          fetchPendingRequests();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchFriends, fetchPendingRequests]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchFriends(), fetchPendingRequests()]);
  }, [fetchFriends, fetchPendingRequests]);

  return { friends, pendingRequests, loading, refetch };
}

export async function searchUsers(
  query: string,
  excludeUserId: string | undefined,
): Promise<FriendSearchResult[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, streak_count")
    .ilike("username", `%${query}%`)
    .neq("id", excludeUserId ?? "")
    .limit(10);

  return data ?? [];
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string,
) {
  await supabase.from("friendships").insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: "pending",
  });
}

export async function acceptFriendRequest(friendshipId: string) {
  await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);
}

export async function removeFriendship(friendshipId: string) {
  await supabase.from("friendships").delete().eq("id", friendshipId);
}
