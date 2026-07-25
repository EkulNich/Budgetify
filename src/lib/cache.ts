export function isCacheFresh(
    generatedAt: string,
    maxAgeHours: number,
    now: number = Date.now(),
): boolean {
    const ageMs = now - new Date(generatedAt).getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    return ageMs < maxAgeMs;
}
