import { useCallback, useEffect, useState } from "react";

import { isCacheFresh } from "@/lib/cache";
import { convertAmount, type ExchangeRates } from "@/lib/currency";
import { supabase } from "@/lib/supabase";

const RATES_BASE = "USD";
const RATES_MAX_AGE_HOURS = 24;

async function fetchFreshRates(): Promise<ExchangeRates> {
  const response = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=${RATES_BASE}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.status}`);
  }
  const data = await response.json();
  return { base: RATES_BASE, rates: data.rates as Record<string, number> };
}

/** Daily-cached exchange rates (via Supabase), with a `convert` helper for any currency pair. */
export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cached } = await supabase
        .from("exchange_rates")
        .select("rates, fetched_at")
        .eq("base", RATES_BASE)
        .maybeSingle();

      if (cached && isCacheFresh(cached.fetched_at, RATES_MAX_AGE_HOURS)) {
        setRates({ base: RATES_BASE, rates: cached.rates });
        return;
      }

      const fresh = await fetchFreshRates();
      setRates(fresh);
      await supabase.from("exchange_rates").upsert(
        {
          base: RATES_BASE,
          rates: fresh.rates,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "base" },
      );
    } catch (error) {
      console.error("Failed to load exchange rates:", error);
      // Stale cached rates beat no rates at all.
      if (!rates) setRates(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const convert = useCallback(
    (amount: number, from: string, to: string) => {
      if (!rates) return amount;
      return convertAmount(amount, from, to, rates);
    },
    [rates],
  );

  return { rates, loading, convert, refetch };
}
