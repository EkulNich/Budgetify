import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useSettlementHistory } from "@/hooks/data/use-settlement-history";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency, formatExpenseDate } from "@/lib/format";
import { router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettlementHistoryScreen() {
  const colors = useTheme();
  const { user } = useCurrentUser();
  const { history, loading } = useSettlementHistory(user?.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText style={{ color: colors.backgroundElement, fontSize: 16 }}>
              ← Back
            </ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={{ color: colors.backgroundElement }}>
            History
          </ThemedText>
          <View style={{ width: 60 }} />
        </View>

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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
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
