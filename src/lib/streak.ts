export function calculateStreak(
    lastExpenseDate: string | null,
    currentStreakCount: number,
    today: string,
): number {
    if (!lastExpenseDate) return 1;

    const lastDate = new Date(lastExpenseDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return currentStreakCount;
    if (diffDays === 1) return (currentStreakCount || 0) + 1;
    return 1;
}

/**
 * Whether the stored streak count is still valid to display "today": the streak count is
 * maintained elsewhere (assumed server-side, on expense insert), this only decides whether
 * it's stale. Returns 0 once a day has been missed, otherwise returns the stored count as-is.
 */
export function getDisplayStreak(
    lastExpenseDate: string | null,
    storedStreakCount: number,
    today: string,
): number {
    if (!lastExpenseDate) return 0;

    const yesterday = new Date(
        new Date(today).getTime() - 24 * 60 * 60 * 1000,
    )
        .toISOString()
        .split("T")[0];

    if (lastExpenseDate === today || lastExpenseDate === yesterday) {
        return storedStreakCount ?? 0;
    }
    return 0;
}
