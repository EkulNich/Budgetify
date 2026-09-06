import { useCallback, useEffect, useState } from "react";

import { calculateBalances, type Balance } from "@/lib/settlements";
import { supabase } from "@/lib/supabase";

export type MemberBalance = Balance & { username: string };

/** Who owes whom within a single pool, netted from every expense and settlement recorded in it. */
export function usePoolBalances(
    poolId: number | null,
    currentUserId: string | undefined,
) {
    const [balances, setBalances] = useState<MemberBalance[]>([]);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        if (!poolId || !currentUserId) {
            setBalances([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const [{ data: expenseData }, { data: settlementData }] = await Promise.all([
            supabase
                .from("group_expenses")
                .select("amount, added_by, split_between")
                .eq("group_id", poolId),
            supabase
                .from("settlements")
                .select("from_user, to_user, amount")
                .eq("group_id", poolId),
        ]);

        const raw = calculateBalances(
            currentUserId,
            expenseData ?? [],
            settlementData ?? [],
        );

        const userIds = raw.map((b) => b.userId);
        const { data: profiles } = userIds.length
            ? await supabase.from("profiles").select("id, username").in("id", userIds)
            : { data: [] as { id: string; username: string }[] };

        setBalances(
            raw
                .map((b) => ({
                    ...b,
                    username:
                        profiles?.find((p) => p.id === b.userId)?.username ?? "Unknown",
                }))
                .sort((a, b) => b.amount - a.amount),
        );
        setLoading(false);
    }, [poolId, currentUserId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    /**
     * Records the full outstanding balance with one member as settled. Only
     * the person owed money can settle it up — the debtor can't unilaterally
     * mark their own debt as paid.
     */
    const settleUp = useCallback(
        async (balance: MemberBalance, currency: string) => {
            if (!poolId || !currentUserId) return;
            if (balance.amount <= 0) {
                throw new Error("Only the person owed money can settle up.");
            }

            const { error } = await supabase.from("settlements").insert({
                group_id: poolId,
                from_user: balance.userId,
                to_user: currentUserId,
                amount: balance.amount,
                currency,
            });

            if (error) {
                console.error("Failed to record settlement:", error.message);
                throw error;
            }

            await refetch();
        },
        [poolId, currentUserId, refetch],
    );

    return { balances, loading, refetch, settleUp };
}
