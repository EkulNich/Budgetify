/// <reference types="jest" />

import { isCacheFresh } from "../src/lib/cache";

describe("isCacheFresh", () => {
    const fixedNow = new Date("2026-07-25T12:00:00Z").getTime();

    test("cache from 1 hour ago is fresh", () => {
        const oneHourAgo = "2026-07-25T11:00:00Z";
        expect(isCacheFresh(oneHourAgo, 24, fixedNow)).toBe(true);
    });

    test("cache from 23 hours ago is fresh", () => {
        const twentyThreeHoursAgo = "2026-07-24T13:00:00Z";
        expect(isCacheFresh(twentyThreeHoursAgo, 24, fixedNow)).toBe(true);
    });

    test("cache from 25 hours ago is stale", () => {
        const twentyFiveHoursAgo = "2026-07-24T11:00:00Z";
        expect(isCacheFresh(twentyFiveHoursAgo, 24, fixedNow)).toBe(false);
    });

    test("cache from exactly 24 hours ago is stale (not fresh)", () => {
        const exactlyOneDayAgo = "2026-07-24T12:00:00Z";
        expect(isCacheFresh(exactlyOneDayAgo, 24, fixedNow)).toBe(false);
    });

    test("cache from just generated is fresh", () => {
        const justNow = "2026-07-25T12:00:00Z";
        expect(isCacheFresh(justNow, 24, fixedNow)).toBe(true);
    });

    test("cache from a week ago is stale", () => {
        const weekAgo = "2026-07-18T12:00:00Z";
        expect(isCacheFresh(weekAgo, 24, fixedNow)).toBe(false);
    });

    test("shorter max age = stricter freshness (2 hours old fails 1-hour check)", () => {
        const twoHoursAgo = "2026-07-25T10:00:00Z";
        expect(isCacheFresh(twoHoursAgo, 1, fixedNow)).toBe(false);
    });
});
