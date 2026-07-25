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
