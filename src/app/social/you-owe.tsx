import { BalanceListScreen } from "@/components/social/balance-list-screen";
import { useBalancesSummary } from "@/hooks/data/use-balances-summary";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useProfile } from "@/hooks/data/use-profile";

const NEGATIVE_RED = "#C0392B";

export default function YouOweScreen() {
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const { owedByYou } = useBalancesSummary(user?.id, currency, convert);

  return (
    <BalanceListScreen
      summaryLabel="Total You Owe"
      summaryIcon="down"
      balances={owedByYou}
      currency={currency}
      color={NEGATIVE_RED}
      emptyText="You don't owe anyone anything right now."
    />
  );
}
