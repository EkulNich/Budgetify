import { BalanceListScreen } from "@/components/social/balance-list-screen";
import { useBalancesSummary, type NamedBalance } from "@/hooks/data/use-balances-summary";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useProfile } from "@/hooks/data/use-profile";
import { formatCurrency } from "@/lib/format";
import { Alert } from "react-native";

const PRIMARY_GREEN = "#2D612A";

export default function OwedToYouScreen() {
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const { owedToYou, settleAllWith } = useBalancesSummary(user?.id, currency, convert);

  const handleSettle = (balance: NamedBalance) => {
    Alert.alert(
      "Settle Up",
      `Mark everything ${balance.username} owes you (${formatCurrency(balance.amount, currency)}, across every shared pool) as paid back?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await settleAllWith(balance.userId);
            } catch (error) {
              Alert.alert("Error", (error as Error).message);
            }
          },
        },
      ],
    );
  };

  return (
    <BalanceListScreen
      summaryLabel="Total Owed"
      balances={owedToYou}
      currency={currency}
      color={PRIMARY_GREEN}
      onSettle={handleSettle}
      emptyText="No one owes you anything right now."
    />
  );
}
