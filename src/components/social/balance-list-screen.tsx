import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { NamedBalance } from "@/hooks/data/use-balances-summary";
import { formatCurrency } from "@/lib/format";
import { router } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MoneySummaryCard } from "./money-summary-card";

type BalanceListScreenProps = {
  summaryLabel: string;
  /** "shine" for a positive/owed-to-you balance, "down" for money owed out. */
  summaryIcon?: "shine" | "down";
  balances: NamedBalance[];
  currency: string;
  color: string;
  onSettle?: (balance: NamedBalance) => void;
  emptyText: string;
};

/** Full-page list of who owes (or is owed) money, reached from a Social-tab hero card. */
export function BalanceListScreen({
  summaryLabel,
  summaryIcon = "shine",
  balances,
  currency,
  color,
  onSettle,
  emptyText,
}: BalanceListScreenProps) {
  const total = balances.reduce((sum, b) => sum + b.amount, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={color} />
            <ThemedText style={[styles.backText, { color }]}>Back</ThemedText>
          </TouchableOpacity>

          {balances.length > 0 && (
            <MoneySummaryCard
              label={summaryLabel}
              amount={total}
              currency={currency}
              subtext={`Across ${balances.length} ${balances.length === 1 ? "person" : "people"}`}
              color={color}
              icon={summaryIcon}
            />
          )}

          {balances.length === 0 ? (
            <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>
          ) : (
            balances.map((balance) => (
              <View key={balance.userId} style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: color + "14" }]}>
                  <ThemedText style={[styles.avatarText, { color }]}>
                    {balance.username.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.name}>{balance.username}</ThemedText>
                  <ThemedText style={[styles.amount, { color }]}>
                    {formatCurrency(balance.amount, currency)}
                  </ThemedText>
                </View>
                {onSettle && (
                  <TouchableOpacity
                    style={[styles.settleBtn, { backgroundColor: color }]}
                    onPress={() => onSettle(balance)}
                  >
                    <ThemedText style={styles.settleBtnText}>Settle Up</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "700",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23262B",
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  settleBtn: {
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  settleBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: Spacing.four,
  },
});
