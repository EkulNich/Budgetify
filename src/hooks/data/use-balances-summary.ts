import { useCallback, useEffect, useRef, useState } from "react";

import { calculateBalances } from "@/lib/settlements";
import { supabase } from "@/lib/supabase";

export type NamedBalance = { userId: string; username: string; amount: number };

type PoolLedger = {
    groupId: number;
    currency: string;
    expenses: {
        amount: number;
        added_by: string;
        split_between: string[] | null;
        split_amounts: Record<string, number> | null;
    }[];
    settlements: { from_user: string; to_user: string; amount: number }[];
};

function convertSplitAmounts(
    splitAmounts: Record<string, number> | null | undefined,
    convert: (amount: number, from: string, to: string) => number,
    from: string,
    to: string,
): Record<string, number> | null {
    if (!splitAmounts) return null;
    return Object.fromEntries(
        Object.entries(splitAmounts).map(([userId, amount]) => [
            userId,
            convert(Number(amount) || 0, from, to),
        ]),
    );
}

/**
 * Net balances against every other person, combined across every pool the
 * current user shares with them. `owedToYou` and `owedByYou` both carry
 * positive amounts — the direction is which list they're in.
 */
export function useBalancesSummary(
    userId: string | undefined,
    currency: string,
    convert: (amount: number, from: string, to: string) => number,
) {
    const [owedToYou, setOwedToYou] = useState<NamedBalance[]>([]);
    const [owedByYou, setOwedByYou] = useState<NamedBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const poolLedgersRef = useRef<PoolLedger[]>([]);

    const refetch = useCallback(async () => {
        if (!userId) {
            setOwedToYou([]);
            setOwedByYou([]);
            poolLedgersRef.current = [];
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
            setOwedToYou([]);
            setOwedByYou([]);
            poolLedgersRef.current = [];
            setLoading(false);
            return;
        }

        const [
            { data: groups, error: groupsError },
            { data: expenseData, error: expenseError },
            { data: settlementData, error: settlementError },
        ] = await Promise.all([
            supabase.from("groups").select("id, currency").in("id", poolIds),
            supabase
                .from("group_expenses")
                .select("group_id, amount, added_by, split_between, split_amounts, currency")
                .in("group_id", poolIds),
            supabase
                .from("settlements")
                .select("group_id, from_user, to_user, amount, currency")
                .in("group_id", poolIds),
        ]);

        if (groupsError || expenseError || settlementError) {
            console.error(
                "Failed to load balances summary:",
                groupsError?.message ?? expenseError?.message ?? settlementError?.message,
            );
            setLoading(false);
            return;
        }

        poolLedgersRef.current = poolIds.map((groupId) => ({
            groupId,
            currency: groups?.find((g) => g.id === groupId)?.currency ?? "SGD",
            expenses: (expenseData ?? []).filter((e) => e.group_id === groupId),
            settlements: (settlementData ?? []).filter((s) => s.group_id === groupId),
        }));

        const convertedExpenses = (expenseData ?? []).map((e) => ({
            ...e,
            amount: convert(Number(e.amount) || 0, e.currency, currency),
            split_amounts: convertSplitAmounts(e.split_amounts, convert, e.currency, currency),
        }));
        const convertedSettlements = (settlementData ?? []).map((s) => ({
            ...s,
            amount: convert(Number(s.amount) || 0, s.currency, currency),
        }));

        const raw = calculateBalances(userId, convertedExpenses, convertedSettlements);

        const otherUserIds = raw.map((b) => b.userId);
        const { data: profiles } = otherUserIds.length
            ? await supabase.from("profiles").select("id, username").in("id", otherUserIds)
            : { data: [] as { id: string; username: string }[] };

        const named = raw.map((b) => ({
            userId: b.userId,
            username: profiles?.find((p) => p.id === b.userId)?.username ?? "Unknown",
            amount: b.amount,
        }));

        setOwedToYou(
            named
                .filter((b) => b.amount > 0)
                .sort((a, b) => b.amount - a.amount),
        );
        setOwedByYou(
            named
                .filter((b) => b.amount < 0)
                .map((b) => ({ ...b, amount: -b.amount }))
                .sort((a, b) => b.amount - a.amount),
        );
        setLoading(false);
    }, [userId, currency, convert]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    /**
     * Fully settles every pool shared with one person in a single action —
     * each pool's own outstanding balance with them is cleared, in that
     * pool's own currency, regardless of which way it runs in that pool.
     */
    const settleAllWith = useCallback(
        async (otherUserId: string) => {
            if (!userId) return;

            const writes = poolLedgersRef.current
                .map((pool) => {
                    const subBalance = calculateBalances(
                        userId,
                        pool.expenses,
                        pool.settlements,
                    ).find((b) => b.userId === otherUserId);
                    if (!subBalance) return null;

                    const theyOweYou = subBalance.amount > 0;
                    return {
                        group_id: pool.groupId,
                        from_user: theyOweYou ? otherUserId : userId,
                        to_user: theyOweYou ? userId : otherUserId,
                        amount: Math.abs(subBalance.amount),
                        currency: pool.currency,
                    };
                })
                .filter((write): write is NonNullable<typeof write> => write !== null);

            if (writes.length === 0) return;

            const { error } = await supabase.from("settlements").insert(writes);
            if (error) {
                console.error("Failed to settle up:", error.message);
                throw error;
            }

            await refetch();
        },
        [userId, refetch],
    );

    return { owedToYou, owedByYou, loading, refetch, settleAllWith };
}
