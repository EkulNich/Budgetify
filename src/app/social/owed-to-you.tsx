import { BalanceListScreen } from "@/components/social/balance-list-screen";
import { useBalancesSummary, type NamedBalance } from "@/hooks/data/use-balances-summary";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useNudges } from "@/hooks/data/use-nudges";
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
  const { sendNudge } = useNudges();

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

  const handleNudge = async (balance: NamedBalance) => {
    if (!user || !profile) return;
    try {
      await sendNudge({
        fromUserId: user.id,
        fromUsername: profile.username ?? "Someone",
        toUserId: balance.userId,
        direction: "remind_to_pay",
        amount: balance.amount,
        currency,
      });
      Alert.alert("Nudge sent", `${balance.username} has been reminded to settle up.`);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleNudgeAll = () => {
    if (!user || !profile) return;
    Alert.alert(
      "Nudge Everyone",
      `Remind all ${owedToYou.length} people to settle up with you?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Nudge All",
          onPress: async () => {
            const results = await Promise.allSettled(
              owedToYou.map((balance) =>
                sendNudge({
                  fromUserId: user.id,
                  fromUsername: profile.username ?? "Someone",
                  toUserId: balance.userId,
                  direction: "remind_to_pay",
                  amount: balance.amount,
                  currency,
                }),
              ),
            );
            const failed = results.filter((r) => r.status === "rejected").length;
            if (failed > 0) {
              Alert.alert("Some nudges failed", `${failed} of ${owedToYou.length} couldn't be sent.`);
            } else {
              Alert.alert("Nudges sent", "Everyone has been reminded to settle up.");
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
      onNudge={handleNudge}
      nudgeLabel="Remind"
      onNudgeAll={handleNudgeAll}
      nudgeAllLabel="Nudge Everyone"
      emptyText="No one owes you anything right now."
    />
  );
}
