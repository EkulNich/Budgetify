import { useEffect, useRef, useState } from "react";

/**
 * Smoothly tweens a displayed number from wherever it currently is toward a
 * new target whenever `value` changes — counts up when it rises, down when
 * it falls. Picks up mid-flight from the current position if the target
 * changes again before the previous animation finishes, so it never jumps.
 */
export function useAnimatedNumber(value: number, duration = 600): number {
    const [displayValue, setDisplayValue] = useState(value);
    const currentRef = useRef(value);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const from = currentRef.current;
        const to = value;
        if (from === to) return;

        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        let start: number | null = null;

        const tick = (timestamp: number) => {
            if (start === null) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = from + (to - from) * eased;
            currentRef.current = next;
            setDisplayValue(next);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick);
            }
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        };
    }, [value, duration]);

    return displayValue;
}
