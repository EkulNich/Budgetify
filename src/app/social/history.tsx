import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MoneySummaryCard } from "@/components/social/money-summary-card";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useProfile } from "@/hooks/data/use-profile";
import { useSettlementHistory } from "@/hooks/data/use-settlement-history";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency, formatExpenseDate } from "@/lib/format";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY_GREEN = "#2D612A";

export default function SettlementHistoryScreen() {
  const colors = useTheme();
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const { history, loading } = useSettlementHistory(user?.id);

  const received = useMemo(
    () => history.filter((r) => r.toUserId === user?.id),
    [history, user?.id],
  );
  const totalReceived = received.reduce(
    (sum, r) => sum + convert(r.amount, r.currency, currency),
    0,
  );
  const lastReceivedDate = received[0] ? formatExpenseDate(received[0].createdAt) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.backgroundElement} />
          <ThemedText style={{ color: colors.backgroundElement, fontSize: 16, fontWeight: "600" }}>
            Back
          </ThemedText>
        </TouchableOpacity>

        {received.length > 0 && (
          <View style={styles.summaryWrap}>
            <MoneySummaryCard
              label="Total Received"
              amount={totalReceived}
              currency={currency}
              subtext={`${received.length} ${received.length === 1 ? "payment" : "payments"}${
                lastReceivedDate ? ` • Last received ${lastReceivedDate}` : ""
              }`}
              color={PRIMARY_GREEN}
            />
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.backgroundElement} style={{ marginTop: Spacing.four }} />
        ) : history.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No settlements recorded yet.
          </ThemedText>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {history.map((record) => {
              const youPaid = record.fromUserId === user?.id;
              const youReceived = record.toUserId === user?.id;
              const description = youPaid
                ? `You paid ${record.toUsername}`
                : youReceived
                  ? `${record.fromUsername} paid you`
                  : `${record.fromUsername} paid ${record.toUsername}`;

              return (
                <View
                  key={record.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.backgroundElement + "10" },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={{ color: colors.backgroundElement, fontWeight: "600" }}
                    >
                      {description}
                    </ThemedText>
                    <ThemedText style={{ color: "#888", fontSize: 13 }}>
                      {record.poolName}
                    </ThemedText>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ThemedText
                      style={{ color: colors.backgroundElement, fontWeight: "700" }}
                    >
                      {formatCurrency(record.amount, record.currency)}
                    </ThemedText>
                    <ThemedText style={{ color: "#888", fontSize: 12 }}>
                      {formatExpenseDate(record.createdAt)}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.three,
  },
  summaryWrap: { marginBottom: Spacing.three },
  scrollContent: { gap: Spacing.two, paddingBottom: Spacing.four },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 12,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: Spacing.four,
  },
});
