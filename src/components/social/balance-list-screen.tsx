import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { NamedBalance } from "@/hooks/data/use-balances-summary";
import { formatCurrency } from "@/lib/format";
import { router } from "expo-router";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
            <View style={[styles.summaryCard, { backgroundColor: color + "1F" }]}>
              <View style={[styles.circleLg, { backgroundColor: color + "14" }]} />
              <View style={[styles.circleSm, { backgroundColor: color + "12" }]} />
              <View style={styles.summaryRow}>
                <View>
                  <ThemedText style={[styles.summaryLabel, { color }]}>
                    {summaryLabel}
                  </ThemedText>
                  <ThemedText style={[styles.summaryValue, { color }]}>
                    {formatCurrency(total, currency)}
                  </ThemedText>
                  <ThemedText style={[styles.summarySubtext, { color }]}>
                    Across {balances.length} {balances.length === 1 ? "person" : "people"}
                  </ThemedText>
                </View>
                <View style={styles.summaryIconWrap}>
                  <FontAwesome5 name="coins" size={38} color={color} />
                  <Ionicons
                    name={summaryIcon === "down" ? "arrow-down-circle" : "sparkles"}
                    size={16}
                    color={color}
                    style={styles.summarySparkle}
                  />
                </View>
              </View>
            </View>
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
  scrollContent: { paddingBottom: Spacing.four },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.three,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryCard: {
    borderRadius: 24,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    overflow: "hidden",
  },
  circleLg: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    top: -60,
    right: -40,
  },
  circleSm: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    bottom: -50,
    right: 30,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    opacity: 0.75,
  },
  summaryValue: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "800",
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: 14,
    opacity: 0.75,
    marginTop: 2,
  },
  summaryIconWrap: {
    marginTop: 4,
  },
  summarySparkle: {
    position: "absolute",
    top: -10,
    right: -10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: Spacing.two,
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
