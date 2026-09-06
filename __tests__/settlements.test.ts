declare const describe: any;
declare const test: any;
declare const expect: any;

import { calculateBalances } from "../src/lib/settlements";

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
});
