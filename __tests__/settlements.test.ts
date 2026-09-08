declare const describe: any;
declare const test: any;
declare const expect: any;

import { calculateBalances, wouldOrphanSettlement } from "../src/lib/settlements";

const YOU = "you";
const ALICE = "alice";
const BOB = "bob";
const CARL = "carl";

describe("calculateBalances", () => {
    test("everyone else owes you their share when you paid", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 100, added_by: YOU, split_between: [YOU, ALICE, BOB, CARL] }],
            [],
        );
        expect(balances).toEqual(
            expect.arrayContaining([
                { userId: ALICE, amount: 25 },
                { userId: BOB, amount: 25 },
                { userId: CARL, amount: 25 },
            ]),
        );
        expect(balances).toHaveLength(3);
    });

    test("you owe the payer your share when someone else paid", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 100, added_by: ALICE, split_between: [ALICE, YOU, BOB, CARL] }],
            [],
        );
        expect(balances).toEqual([{ userId: ALICE, amount: -25 }]);
    });

    test("an expense you're not involved in doesn't affect your balances", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 100, added_by: ALICE, split_between: [ALICE, BOB, CARL] }],
            [],
        );
        expect(balances).toEqual([]);
    });

    test("a settlement someone pays you reduces what they owe", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 100, added_by: YOU, split_between: [YOU, ALICE] }],
            [{ from_user: ALICE, to_user: YOU, amount: 50 }],
        );
        expect(balances).toEqual([]);
    });

    test("a settlement you pay someone reduces what you owe", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 100, added_by: ALICE, split_between: [ALICE, YOU] }],
            [{ from_user: YOU, to_user: ALICE, amount: 50 }],
        );
        expect(balances).toEqual([]);
    });

    test("a partial settlement leaves the remaining balance", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 100, added_by: YOU, split_between: [YOU, ALICE] }],
            [{ from_user: ALICE, to_user: YOU, amount: 20 }],
        );
        expect(balances).toEqual([{ userId: ALICE, amount: 30 }]);
    });

    test("balances accumulate across multiple expenses", () => {
        const balances = calculateBalances(
            YOU,
            [
                { amount: 100, added_by: YOU, split_between: [YOU, ALICE] },
                { amount: 40, added_by: ALICE, split_between: [ALICE, YOU] },
            ],
            [],
        );
        // Alice owes 50 from the first, you owe 20 from the second: net +30 to you.
        expect(balances).toEqual([{ userId: ALICE, amount: 30 }]);
    });

    test("an expense with no split_between is ignored", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 100, added_by: YOU, split_between: null }],
            [],
        );
        expect(balances).toEqual([]);
    });

    test("a fully settled balance is filtered out entirely, not left at zero", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 50, added_by: YOU, split_between: [YOU, ALICE] }],
            [{ from_user: ALICE, to_user: YOU, amount: 25 }],
        );
        expect(balances).toEqual([]);
    });

    test("a custom exact split uses each person's own share, not an equal division", () => {
        const balances = calculateBalances(
            YOU,
            [
                {
                    amount: 100,
                    added_by: YOU,
                    split_between: [YOU, ALICE, BOB],
                    split_amounts: { [YOU]: 50, [ALICE]: 30, [BOB]: 20 },
                },
            ],
            [],
        );
        expect(balances).toEqual(
            expect.arrayContaining([
                { userId: ALICE, amount: 30 },
                { userId: BOB, amount: 20 },
            ]),
        );
        expect(balances).toHaveLength(2);
    });

    test("a custom percentage-derived split is honored the same way", () => {
        const balances = calculateBalances(
            YOU,
            [
                {
                    amount: 200,
                    added_by: ALICE,
                    split_between: [ALICE, YOU],
                    split_amounts: { [ALICE]: 150, [YOU]: 50 },
                },
            ],
            [],
        );
        expect(balances).toEqual([{ userId: ALICE, amount: -50 }]);
    });

    test("an expense with no split_amounts still falls back to an equal share", () => {
        const balances = calculateBalances(
            YOU,
            [{ amount: 90, added_by: YOU, split_between: [YOU, ALICE, BOB] }],
            [],
        );
        expect(balances).toEqual(
            expect.arrayContaining([
                { userId: ALICE, amount: 30 },
                { userId: BOB, amount: 30 },
            ]),
        );
    });
});

describe("wouldOrphanSettlement", () => {
    test("blocks deleting a fully-settled expense (the phantom-flip bug)", () => {
        const dinner = { id: 1, amount: 100, added_by: YOU, split_between: [YOU, ALICE] };
        const settlements = [{ from_user: ALICE, to_user: YOU, amount: 50 }];

        expect(wouldOrphanSettlement(dinner, [dinner], settlements)).toBe(true);
    });

    test("allows deleting an expense with no settlements at all", () => {
        const dinner = { id: 1, amount: 100, added_by: YOU, split_between: [YOU, ALICE] };

        expect(wouldOrphanSettlement(dinner, [dinner], [])).toBe(false);
    });

    test("allows deleting an expense when another expense still covers the settlement", () => {
        const dinner = { id: 1, amount: 100, added_by: YOU, split_between: [YOU, ALICE] };
        const lunch = { id: 2, amount: 40, added_by: YOU, split_between: [YOU, ALICE] };
        // Alice partially settles $20 — well within what dinner alone already covers.
        const settlements = [{ from_user: ALICE, to_user: YOU, amount: 20 }];

        expect(
            wouldOrphanSettlement(lunch, [dinner, lunch], settlements),
        ).toBe(false);
    });

    test("blocks deleting the expense a settlement actually depended on, even with another expense present", () => {
        const dinner = { id: 1, amount: 100, added_by: YOU, split_between: [YOU, ALICE] };
        const reimbursement = {
            id: 2,
            amount: 40,
            added_by: ALICE,
            split_between: [ALICE, YOU],
        };
        // Net raw balance is +30 (Alice owes you), fully explained by dinner.
        // Settling $20 is fine against that net... but removing dinner leaves
        // a reversed raw balance the settlement no longer matches.
        const settlements = [{ from_user: ALICE, to_user: YOU, amount: 20 }];

        expect(
            wouldOrphanSettlement(dinner, [dinner, reimbursement], settlements),
        ).toBe(true);
    });

    test("blocks deleting an expense when a settlement now exceeds the remaining debt", () => {
        const dinner = { id: 1, amount: 100, added_by: YOU, split_between: [YOU, ALICE] };
        const coffee = { id: 2, amount: 10, added_by: YOU, split_between: [YOU, ALICE] };
        // Alice settles $40 — fine against the combined $55 owed, but too much
        // for coffee's $5 share alone once dinner is removed.
        const settlements = [{ from_user: ALICE, to_user: YOU, amount: 40 }];

        expect(wouldOrphanSettlement(dinner, [dinner, coffee], settlements)).toBe(true);
    });

    test("an expense with only the payer in split_between can't orphan anything", () => {
        const soloExpense = { id: 1, amount: 20, added_by: YOU, split_between: [YOU] };

        expect(wouldOrphanSettlement(soloExpense, [soloExpense], [])).toBe(false);
    });

    test("settlements between unrelated people don't block the deletion", () => {
        const dinner = { id: 1, amount: 100, added_by: YOU, split_between: [YOU, ALICE] };
        const unrelatedSettlement = [{ from_user: BOB, to_user: CARL, amount: 30 }];

        expect(wouldOrphanSettlement(dinner, [dinner], unrelatedSettlement)).toBe(false);
    });
});
