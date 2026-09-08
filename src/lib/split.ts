export type SplitMode = "equal" | "exact" | "percentage";

const TOLERANCE = 0.01;

/** Per-target dollar amounts for a bill, given the chosen split mode and any custom entries. */
export function calculateSplitAmounts(
    total: number,
    targets: string[],
    mode: SplitMode,
    customAmounts: Record<string, string>,
    customPercentages: Record<string, string>,
): Record<string, number> {
    if (mode === "equal") {
        const share = total / targets.length;
        return Object.fromEntries(targets.map((id) => [id, share]));
    }
    if (mode === "exact") {
        return Object.fromEntries(
            targets.map((id) => [id, parseFloat(customAmounts[id] || "0") || 0]),
        );
    }
    return Object.fromEntries(
        targets.map((id) => [
            id,
            (total * (parseFloat(customPercentages[id] || "0") || 0)) / 100,
        ]),
    );
}

export type SplitValidation = { valid: boolean; total: number; remaining: number };

/** Whether the entered exact amounts add up to the bill total (within a cent). */
export function validateExactSplit(
    total: number,
    targets: string[],
    customAmounts: Record<string, string>,
): SplitValidation {
    const sum = targets.reduce(
        (acc, id) => acc + (parseFloat(customAmounts[id] || "0") || 0),
        0,
    );
    return { valid: Math.abs(sum - total) <= TOLERANCE, total: sum, remaining: total - sum };
}

/** Whether the entered percentages add up to 100 (within a rounding hair). */
export function validatePercentageSplit(
    targets: string[],
    customPercentages: Record<string, string>,
): SplitValidation {
    const sum = targets.reduce(
        (acc, id) => acc + (parseFloat(customPercentages[id] || "0") || 0),
        0,
    );
    return { valid: Math.abs(sum - 100) <= TOLERANCE, total: sum, remaining: 100 - sum };
}
