export type ExchangeRates = {
    /** The currency every rate in `rates` is quoted against (1 unit of `base`). */
    base: string;
    /** Units of each currency per 1 unit of `base`. Does not include `base` itself (implicitly 1). */
    rates: Record<string, number>;
};

function rateFor(code: string, exchangeRates: ExchangeRates): number {
    if (code === exchangeRates.base) return 1;
    const rate = exchangeRates.rates[code];
    if (!rate) {
        throw new Error(`No exchange rate available for currency "${code}"`);
    }
    return rate;
}

/** Converts an amount between two currencies via a USD-anchored (or any single-base) rate table. */
export function convertAmount(
    amount: number,
    from: string,
    to: string,
    exchangeRates: ExchangeRates,
): number {
    if (from === to) return amount;

    const amountInBase = amount / rateFor(from, exchangeRates);
    return amountInBase * rateFor(to, exchangeRates);
}
