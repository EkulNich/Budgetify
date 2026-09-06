import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import type { NamedBalance } from "@/hooks/data/use-balances-summary";
import { useBalancesSummary } from "@/hooks/data/use-balances-summary";
import { useProfile } from "@/hooks/data/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY_GREEN = "#2D612A";
const NEGATIVE_RED = "#C0392B";

function BalanceList({
  title,
  balances,
  currency,
  color,
  onSettle,
}: {
  title: string;
  balances: NamedBalance[];
  currency: string;
  color: string;
  onSettle?: (balance: NamedBalance) => void;
}) {
  if (balances.length === 0) return null;

  return (
    <View style={styles.owedSection}>
      <ThemedText style={[styles.owedTitle, { color }]}>{title}</ThemedText>
      <Card style={styles.owedCard}>
        {balances.map((balance, index) => (
          <View
            key={balance.userId}
            style={[
              styles.owedRow,
              index < balances.length - 1 && styles.owedRowDivider,
            ]}
          >
            <View>
              <ThemedText style={styles.owedName}>{balance.username}</ThemedText>
              <ThemedText style={[styles.owedAmount, { color }]}>
                {formatCurrency(balance.amount, currency)}
              </ThemedText>
            </View>
            {onSettle && (
              <TouchableOpacity
                style={[styles.settleBtn, { borderColor: color }]}
                onPress={() => onSettle(balance)}
              >
                <ThemedText style={{ color, fontWeight: "600", fontSize: 13 }}>
                  Settle Up
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Card>
    </View>
  );
}

export default function SocialScreen() {
  const colors = useTheme();
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const {
    owedToYou,
    owedByYou,
    refetch: refetchBalances,
    settleAllWith,
  } = useBalancesSummary(user?.id, currency, convert);

  useFocusEffect(
    useCallback(() => {
      refetchBalances();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, currency]),
  );

  const handleSettleAll = (balance: NamedBalance) => {
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText
            type="title"
            style={{
              color: colors.backgroundElement,
              marginBottom: Spacing.four,
            }}
          >
            Social
          </ThemedText>

          <TouchableOpacity
            style={[styles.banner, { backgroundColor: colors.backgroundElement }]}
            onPress={() => router.push("/social/friends")}
          >
            <ThemedText style={styles.bannerTitle}>👥 Friends</ThemedText>
            <ThemedText style={styles.bannerSub}>
              View friends, streaks & requests
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.banner, { backgroundColor: colors.backgroundElement }]}
            onPress={() => router.push("/social/pools")}
          >
            <ThemedText style={styles.bannerTitle}>💰 Group Pools</ThemedText>
            <ThemedText style={styles.bannerSub}>
              Shared budgets with your friends
            </ThemedText>
          </TouchableOpacity>

          <BalanceList
            title="People Who Owe You"
            balances={owedToYou}
            currency={currency}
            color={PRIMARY_GREEN}
            onSettle={handleSettleAll}
          />

          <BalanceList
            title="People You Owe"
            balances={owedByYou}
            currency={currency}
            color={NEGATIVE_RED}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  banner: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  bannerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  bannerSub: { fontSize: 14, color: "#ffffff99" },
  owedSection: { gap: Spacing.two },
  owedTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  owedCard: { padding: 0, gap: 0, overflow: "hidden" },
  owedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.three,
  },
  owedRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDED",
  },
  owedName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#23262B",
  },
  owedAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  settleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
