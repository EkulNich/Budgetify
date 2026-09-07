export type Balance = { userId: string; amount: number };

type ExpenseForBalance = {
    amount: number;
    added_by: string;
    split_between: string[] | null;
};

/**
 * Settlements are an append-only audit trail — once recorded, a settlement is
 * never edited or deleted (enforced at the database level too: the
 * `authenticated` role only has SELECT/INSERT on `settlements`). Never add
 * update/delete code paths for them; if a settlement was wrong, record a new,
 * correcting one instead.
 */
type SettlementForBalance = {
    from_user: string;
    to_user: string;
    amount: number;
};

const ZERO_THRESHOLD = 0.005;

/**
 * Net balance between the current user and every other person they've shared
 * expenses or settlements with. Positive = they owe the current user;
 * negative = the current user owes them. Amounts must already be in a single
 * common currency before being passed in.
 */
export function calculateBalances(
    currentUserId: string,
    expenses: ExpenseForBalance[],
    settlements: SettlementForBalance[],
): Balance[] {
    const balances: Record<string, number> = {};

    for (const expense of expenses) {
        const targets = expense.split_between ?? [];
        if (targets.length === 0) continue;

        const share = expense.amount / targets.length;
        for (const target of targets) {
            if (target === expense.added_by) continue;

            if (expense.added_by === currentUserId) {
                balances[target] = (balances[target] ?? 0) + share;
            } else if (target === currentUserId) {
                balances[expense.added_by] = (balances[expense.added_by] ?? 0) - share;
            }
        }
    }

    for (const settlement of settlements) {
        if (settlement.to_user === currentUserId) {
            balances[settlement.from_user] =
                (balances[settlement.from_user] ?? 0) - settlement.amount;
        } else if (settlement.from_user === currentUserId) {
            balances[settlement.to_user] =
                (balances[settlement.to_user] ?? 0) + settlement.amount;
        }
    }

    return Object.entries(balances)
        .map(([userId, amount]) => ({ userId, amount }))
        .filter((balance) => Math.abs(balance.amount) > ZERO_THRESHOLD);
}

type ExpenseWithId = ExpenseForBalance & { id: number };

/**
 * Would deleting this expense make settlement history inconsistent with what
 * would be left? A settlement only ever means real money moved *toward*
 * zeroing out a debt — it can never legitimately exceed what's owed, or point
 * the same way as the remaining debt. If removing an expense would break that
 * for any pair it involves, the settlement it was covering would be left
 * "orphaned": the pair's balance would flip to a value that never actually
 * happened in reality.
 */
export function wouldOrphanSettlement(
    expenseToRemove: ExpenseWithId,
    allExpenses: ExpenseWithId[],
    allSettlements: SettlementForBalance[],
): boolean {
    const payer = expenseToRemove.added_by;
    const targets = (expenseToRemove.split_between ?? []).filter((t) => t !== payer);
    if (targets.length === 0) return false;

    const remainingExpenses = allExpenses.filter((e) => e.id !== expenseToRemove.id);

    return targets.some((target) => {
        const rawBalance =
            calculateBalances(payer, remainingExpenses, []).find(
                (b) => b.userId === target,
            )?.amount ?? 0;
        const settledBalance =
            calculateBalances(payer, [], allSettlements).find((b) => b.userId === target)
                ?.amount ?? 0;

        if (rawBalance === 0) return settledBalance !== 0;
        if (Math.sign(rawBalance) === Math.sign(settledBalance)) return true;
        return Math.abs(settledBalance) > Math.abs(rawBalance);
    });
}
