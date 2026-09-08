import { BalanceListScreen } from "@/components/social/balance-list-screen";
import { useBalancesSummary, type NamedBalance } from "@/hooks/data/use-balances-summary";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useNudges } from "@/hooks/data/use-nudges";
import { useProfile } from "@/hooks/data/use-profile";
import { Alert } from "react-native";

const NEGATIVE_RED = "#C0392B";

export default function YouOweScreen() {
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const { owedByYou } = useBalancesSummary(user?.id, currency, convert);
  const { sendNudge } = useNudges();

  const handleNudge = async (balance: NamedBalance) => {
    if (!user || !profile) return;
    try {
      await sendNudge({
        fromUserId: user.id,
        fromUsername: profile.username ?? "Someone",
        toUserId: balance.userId,
        direction: "heads_up",
        amount: balance.amount,
        currency,
      });
      Alert.alert("Nudge sent", `${balance.username} has been given a heads up.`);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleNudgeAll = () => {
    if (!user || !profile) return;
    Alert.alert(
      "Nudge Everyone",
      `Give all ${owedByYou.length} people a heads up that you'll pay them back?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Nudge All",
          onPress: async () => {
            const results = await Promise.allSettled(
              owedByYou.map((balance) =>
                sendNudge({
                  fromUserId: user.id,
                  fromUsername: profile.username ?? "Someone",
                  toUserId: balance.userId,
                  direction: "heads_up",
                  amount: balance.amount,
                  currency,
                }),
              ),
            );
            const failed = results.filter((r) => r.status === "rejected").length;
            if (failed > 0) {
              Alert.alert("Some nudges failed", `${failed} of ${owedByYou.length} couldn't be sent.`);
            } else {
              Alert.alert("Nudges sent", "Everyone has been given a heads up.");
            }
          },
        },
      ],
    );
  };

  return (
    <BalanceListScreen
      summaryLabel="Total You Owe"
      summaryIcon="down"
      balances={owedByYou}
      currency={currency}
      color={NEGATIVE_RED}
      onNudge={handleNudge}
      nudgeLabel="Heads Up"
      onNudgeAll={handleNudgeAll}
      nudgeAllLabel="Nudge Everyone"
      emptyText="You don't owe anyone anything right now."
    />
  );
}
