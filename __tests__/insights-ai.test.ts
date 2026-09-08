declare const describe: any;
declare const test: any;
declare const expect: any;

import { parseInsightsResponse } from "../src/lib/insights-ai";

const VALID_INSIGHT = {
    type: "budget_pace",
    priority: "high",
    title: "You're trending over budget",
    message: "Based on your spending so far, you're projected to spend SGD 2,180 this month.",
};

describe("parseInsightsResponse", () => {
    test("parses a clean JSON response with 3 insights", () => {
        const response = JSON.stringify({
            insights: [
                VALID_INSIGHT,
                { ...VALID_INSIGHT, type: "category_spending", priority: "medium" },
                { ...VALID_INSIGHT, type: "positive_progress", priority: "low" },
            ],
        });
        expect(parseInsightsResponse(response)).toHaveLength(3);
    });

    test("strips markdown code fences around the JSON", () => {
        const response = "```json\n" + JSON.stringify({ insights: [VALID_INSIGHT] }) + "\n```";
        expect(parseInsightsResponse(response)).toEqual([VALID_INSIGHT]);
    });

    test("caps the result at 3 insights even if more are returned", () => {
        const response = JSON.stringify({
            insights: [VALID_INSIGHT, VALID_INSIGHT, VALID_INSIGHT, VALID_INSIGHT, VALID_INSIGHT],
        });
        expect(parseInsightsResponse(response)).toHaveLength(3);
    });

    test("drops an insight with an invalid type", () => {
        const response = JSON.stringify({
            insights: [VALID_INSIGHT, { ...VALID_INSIGHT, type: "not_a_real_type" }],
        });
        expect(parseInsightsResponse(response)).toEqual([VALID_INSIGHT]);
    });

    test("drops an insight with an invalid priority", () => {
        const response = JSON.stringify({
            insights: [VALID_INSIGHT, { ...VALID_INSIGHT, priority: "urgent" }],
        });
        expect(parseInsightsResponse(response)).toEqual([VALID_INSIGHT]);
    });

    test("drops an insight missing a title or message", () => {
        const response = JSON.stringify({
            insights: [
                VALID_INSIGHT,
                { ...VALID_INSIGHT, title: "" },
                { ...VALID_INSIGHT, message: "" },
                { type: "budget_pace", priority: "high" },
            ],
        });
        expect(parseInsightsResponse(response)).toEqual([VALID_INSIGHT]);
    });

    test("returns an empty array when every insight is invalid", () => {
        const response = JSON.stringify({ insights: [{ foo: "bar" }] });
        expect(parseInsightsResponse(response)).toEqual([]);
    });

    test("returns an empty array when the model returns no insights", () => {
        const response = JSON.stringify({ insights: [] });
        expect(parseInsightsResponse(response)).toEqual([]);
    });

    test("throws when there is no JSON object in the response", () => {
        expect(() => parseInsightsResponse("Sorry, I can't help with that.")).toThrow();
    });

    test("throws when the JSON has no insights array", () => {
        expect(() => parseInsightsResponse(JSON.stringify({ foo: "bar" }))).toThrow();
    });
});
