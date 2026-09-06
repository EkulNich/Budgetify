import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BudgetBar } from "@/components/budget-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { isPersonalCategory } from "@/constants/categories";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import type { Expense } from "@/hooks/data/use-expenses";
import { useExpenses } from "@/hooks/data/use-expenses";
import { useMonthlyStats } from "@/hooks/data/use-monthly-stats";
import { useRecommendations } from "@/hooks/data/use-recommendations";
import { getDisplayStreak } from "@/lib/streak";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function SwipeableExpenseRow({
  expense,
  onDelete,
}: {
  expense: Expense;
  onDelete: (id: string) => void;
}) {
  const isGroupExpense = !isPersonalCategory(expense.category);

  return (
    <SwipeableRow
      enabled={!isGroupExpense}
      animateDeleteButton
      deleteButtonStyle={styles.deleteBtn}
      confirmTitle="Delete Expense"
      confirmMessage="Are you sure you want to delete this expense?"
      onDelete={() => onDelete(expense.id)}
    >
      <ThemedView style={styles.expenseRow}>
        <View style={{ flex: 1 }}>
          <ThemedText themeColor="backgroundSelected">
            {expense.category ?? "Uncategorized"}
          </ThemedText>
          {expense.description && (
            <ThemedText type="small" themeColor="textSecondary">
              {expense.description}
            </ThemedText>
          )}
        </View>
        <ThemedText style={{ color: "#C0392B" }}>
          -${Number(expense.amount).toFixed(2)}
        </ThemedText>
      </ThemedView>
    </SwipeableRow>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;

  const stats = useMonthlyStats(user?.id);
  const { expenses: recentExpenses, deleteExpense, refetch: refetchExpenses } =
    useExpenses(user?.id);
  const { recommendations, loading: tipsLoading, refetch: refetchTips } =
    useRecommendations(user?.id);

  const today = new Date().toISOString().split("T")[0];
  const streak = getDisplayStreak(
    stats.profile?.last_expense_date ?? null,
    stats.profile?.streak_count ?? 0,
    today,
  );

  useFocusEffect(
    useCallback(() => {
      stats.refetch();
      refetchExpenses();
      refetchTips();
      // Re-fetch every time this tab regains focus (e.g. after adding an expense),
      // not just on first mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const handleDelete = async (expenseId: string) => {
    await deleteExpense(expenseId);
    await stats.refetch();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={{ alignSelf: "stretch" }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Image
                source={require("@/assets/images/budgetify_name.png")}
                style={styles.logo}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.profileCircle}
                onPress={() => router.push("/(tabs)/profile")}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <ThemedText style={{ color: "white" }}>?</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            <BudgetBar
              spendingLimit={stats.budget}
              outflow={stats.totalSpent}
              streak={streak}
            />

            <Card style={styles.tipCard}>
              <ThemedText type="smallBold" themeColor="backgroundSelected">
                AI Smart Recommendations
              </ThemedText>
              {tipsLoading ? (
                <ActivityIndicator color="#2D612A" />
              ) : recommendations.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No recommendations available
                </ThemedText>
              ) : (
                recommendations.map((tip, index) => (
                  <ThemedText
                    key={index}
                    type="small"
                    themeColor="backgroundSelected"
                    style={{ marginTop: index === 0 ? 4 : 8 }}
                  >
                    {tip}
                  </ThemedText>
                ))
              )}
            </Card>

            <Card style={styles.expensesCard}>
              <ThemedText type="subtitle" themeColor="backgroundSelected">
                Expenses
              </ThemedText>
              {recentExpenses.length === 0 ? (
                <ThemedText type="small">No expenses yet</ThemedText>
              ) : (
                recentExpenses.map((expense) => (
                  <SwipeableExpenseRow
                    key={expense.id}
                    expense={expense}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </Card>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", flexDirection: "row" },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  topBar: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  logo: { width: 200, height: 80, marginLeft: -10 },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2D612A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: "#E8F0E5",
    borderRadius: 12,
    gap: Spacing.three,
  },
  scrollContent: {
    alignSelf: "stretch",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  expensesCard: {
    alignSelf: "stretch",
  },
  tipCard: {
    alignSelf: "stretch",
    gap: Spacing.one,
  },
  deleteBtn: {
    width: 75,
    alignSelf: "stretch",
    height: "100%",
  },
});
