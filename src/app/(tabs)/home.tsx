import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BudgetBar } from "@/components/budget-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { CalendarFilterModal } from "@/components/ui/calendar-filter-modal";
import { IconBadge } from "@/components/ui/icon-badge";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useCategories, type ResolvedCategory } from "@/hooks/data/use-categories";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import type { Expense } from "@/hooks/data/use-expenses";
import { useExpenses } from "@/hooks/data/use-expenses";
import { useMonthlyStats } from "@/hooks/data/use-monthly-stats";
import { useRecommendations } from "@/hooks/data/use-recommendations";
import { useTheme } from "@/hooks/use-theme";
import {
  extractDateOnly,
  formatCurrency,
  formatExpenseDate,
} from "@/lib/format";
import { getDisplayStreak } from "@/lib/streak";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const RECENT_EXPENSE_COUNT = 5;
const PRIMARY_GREEN = "#2D612A";

function SwipeableExpenseRow({
  expense,
  resolveCategory,
  onDelete,
}: {
  expense: Expense;
  resolveCategory: (expense: Expense) => ResolvedCategory;
  onDelete: (id: string) => void;
}) {
  const isGroupExpense = expense.group_id !== null;
  const resolved = resolveCategory(expense);
  const categoryLabel = resolved.label;
  const categoryColor = resolved.color;
  const dateLabel = formatExpenseDate(expense.created_at);

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
        <IconBadge color={categoryColor}>
          <Ionicons
            name={resolved.icon as keyof typeof Ionicons.glyphMap}
            size={19}
            color={categoryColor}
          />
        </IconBadge>
        <View style={{ flex: 1 }}>
          <ThemedText themeColor="backgroundSelected" style={{ fontWeight: "700" }}>
            {expense.description || categoryLabel}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {expense.description ? `${categoryLabel} · ${dateLabel}` : dateLabel}
          </ThemedText>
        </View>
        <ThemedText style={{ color: "#C0392B", fontWeight: "700" }}>
          -{formatCurrency(Number(expense.amount), expense.currency)}
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
  const {
    expenses: recentExpenses,
    deleteExpense,
    refetch: refetchExpenses,
  } = useExpenses(user?.id);
  const { resolve, refetch: refetchCategories } = useCategories(user?.id);
  const resolveExpenseCategory = useCallback(
    (expense: Expense) =>
      resolve(
        expense.category,
        expense.group_id !== null
          ? { type: "pool", poolId: expense.group_id }
          : { type: "personal" },
      ),
    [resolve],
  );
  const { recommendations, loading: tipsLoading } = useRecommendations(user?.id);
  const [allExpensesVisible, setAllExpensesVisible] = useState(false);
  const [allTipsVisible, setAllTipsVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [dateFilterPickerVisible, setDateFilterPickerVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  const markedDates = useMemo(
    () => new Set(recentExpenses.map((e) => extractDateOnly(e.created_at))),
    [recentExpenses],
  );

  const filteredExpenses = dateFilter
    ? recentExpenses.filter((e) => extractDateOnly(e.created_at) === dateFilter)
    : recentExpenses;

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
      refetchCategories();
      // Smart Insights are deliberately NOT re-fetched here — they're cached
      // for 24h server-side, and re-checking on every tab focus caused a
      // visible flash back to "no recommendations" before the cache landed.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const handleDelete = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      await stats.refetch();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
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
              currency={stats.currency}
            />

            <Card style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <View style={styles.tipHeaderLeft}>
                  <IconBadge color={PRIMARY_GREEN}>
                    <Ionicons name="bulb-outline" size={20} color={PRIMARY_GREEN} />
                  </IconBadge>
                  <ThemedText style={styles.tipTitle}>Smart Insight</ThemedText>
                </View>
                {recommendations.length > 1 && (
                  <TouchableOpacity
                    style={styles.seeAllBtn}
                    onPress={() => setAllTipsVisible((v) => !v)}
                  >
                    <ThemedText style={styles.seeAllText}>
                      {allTipsVisible ? "Show Less" : "See All"}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={14} color={PRIMARY_GREEN} />
                  </TouchableOpacity>
                )}
              </View>
              {tipsLoading ? (
                <ActivityIndicator color="#2D612A" />
              ) : recommendations.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No recommendations available
                </ThemedText>
              ) : (
                (allTipsVisible ? recommendations : recommendations.slice(0, 1)).map(
                  (insight, index) => (
                    <View
                      key={index}
                      style={[styles.insightRow, { marginTop: index === 0 ? 4 : 10 }]}
                    >
                      <View
                        style={[
                          styles.insightDot,
                          {
                            backgroundColor:
                              insight.priority === "high"
                                ? "#C0392B"
                                : insight.priority === "low"
                                  ? PRIMARY_GREEN
                                  : "#9AA0A8",
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.insightTitle}>{insight.title}</ThemedText>
                        <ThemedText type="small" style={styles.insightMessage}>
                          {insight.message}
                        </ThemedText>
                      </View>
                    </View>
                  ),
                )
              )}
            </Card>

            <Card style={styles.expensesCard}>
              <View style={styles.expensesHeader}>
                <ThemedText style={styles.expensesTitle}>Recent Expenses</ThemedText>
                {recentExpenses.length > RECENT_EXPENSE_COUNT && (
                  <TouchableOpacity
                    style={styles.seeAllBtn}
                    onPress={() => setAllExpensesVisible(true)}
                  >
                    <ThemedText style={styles.seeAllText}>See All</ThemedText>
                    <Ionicons name="chevron-forward" size={14} color={PRIMARY_GREEN} />
                  </TouchableOpacity>
                )}
              </View>
              {recentExpenses.length === 0 ? (
                <ThemedText type="small">No expenses yet</ThemedText>
              ) : (
                recentExpenses
                  .slice(0, RECENT_EXPENSE_COUNT)
                  .map((expense) => (
                    <SwipeableExpenseRow
                      key={expense.id}
                      expense={expense}
                      resolveCategory={resolveExpenseCategory}
                      onDelete={handleDelete}
                    />
                  ))
              )}
            </Card>
          </ScrollView>
        </SafeAreaView>

        <Modal
          visible={allExpensesVisible}
          animationType="slide"
          onRequestClose={() => setAllExpensesVisible(false)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={styles.container}>
              <SafeAreaView style={styles.safeArea}>
                <View
                  style={[
                    styles.modalHeader,
                    { paddingTop: insets.top + Spacing.two },
                  ]}
                >
                  <ThemedText
                    type="title"
                    style={{ color: "#2D612A", fontSize: 28 }}
                  >
                    All Expenses
                  </ThemedText>
                  <TouchableOpacity onPress={() => setAllExpensesVisible(false)}>
                    <ThemedText style={{ color: "#2D612A", fontWeight: "600" }}>
                      Done
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.filterButton, { borderColor: colors.backgroundElement }]}
                  onPress={() => setDateFilterPickerVisible(true)}
                >
                  <ThemedText style={{ color: colors.backgroundElement }}>
                    {dateFilter ? formatExpenseDate(dateFilter) : "All Dates"}
                  </ThemedText>
                  <ThemedText style={{ color: colors.backgroundElement }}>📅</ThemedText>
                </TouchableOpacity>

                <ScrollView
                  style={{ alignSelf: "stretch" }}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredExpenses.length === 0 ? (
                    <ThemedText type="small">
                      {dateFilter ? "No expenses on this date" : "No expenses yet"}
                    </ThemedText>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <SwipeableExpenseRow
                        key={expense.id}
                        expense={expense}
                        resolveCategory={resolveExpenseCategory}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </ScrollView>

                <CalendarFilterModal
                  visible={dateFilterPickerVisible}
                  selectedDate={dateFilter}
                  markedDates={markedDates}
                  colors={colors}
                  onSelectDate={setDateFilter}
                  onClose={() => setDateFilterPickerVisible(false)}
                />
              </SafeAreaView>
            </ThemedView>
          </GestureHandlerRootView>
        </Modal>
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
  expensesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expensesTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#23262B",
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  modalHeader: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  modalScrollContent: {
    alignSelf: "stretch",
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  filterButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
  },
  tipCard: {
    alignSelf: "stretch",
    gap: Spacing.one,
  },
  tipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tipHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PRIMARY_GREEN,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#23262B",
  },
  insightMessage: {
    color: "#4A4F56",
    marginTop: 1,
  },
  deleteBtn: {
    width: 75,
    alignSelf: "stretch",
    height: "100%",
  },
});
