import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type SettlementRecord = {
    id: number;
    poolName: string;
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    toUsername: string;
    amount: number;
    currency: string;
    createdAt: string;
};

/** Every settlement ever recorded across every pool the current user belongs to, newest first. */
export function useSettlementHistory(userId: string | undefined) {
    const [history, setHistory] = useState<SettlementRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        if (!userId) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data: memberships } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", userId);
        const poolIds = (memberships ?? []).map((m) => m.group_id);

        if (poolIds.length === 0) {
            setHistory([]);
            setLoading(false);
            return;
        }

        const { data: settlements } = await supabase
            .from("settlements")
            .select("id, group_id, from_user, to_user, amount, currency, created_at")
            .in("group_id", poolIds)
            .order("created_at", { ascending: false });

        if (!settlements || settlements.length === 0) {
            setHistory([]);
            setLoading(false);
            return;
        }

        const groupIds = [...new Set(settlements.map((s) => s.group_id))];
        const otherUserIds = [
            ...new Set([
                ...settlements.map((s) => s.from_user),
                ...settlements.map((s) => s.to_user),
            ]),
        ];

        const [{ data: groups }, { data: profiles }] = await Promise.all([
            supabase.from("groups").select("id, name").in("id", groupIds),
            supabase.from("profiles").select("id, username").in("id", otherUserIds),
        ]);

        setHistory(
            settlements.map((s) => ({
                id: s.id,
                poolName: groups?.find((g) => g.id === s.group_id)?.name ?? "Unknown Pool",
                fromUserId: s.from_user,
                fromUsername:
                    profiles?.find((p) => p.id === s.from_user)?.username ?? "Unknown",
                toUserId: s.to_user,
                toUsername: profiles?.find((p) => p.id === s.to_user)?.username ?? "Unknown",
                amount: s.amount,
                currency: s.currency,
                createdAt: s.created_at,
            })),
        );
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { history, loading, refetch };
}
