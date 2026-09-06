export type Balance = { userId: string; amount: number };

type ExpenseForBalance = {
    amount: number;
    added_by: string;
    split_between: string[] | null;
};

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
