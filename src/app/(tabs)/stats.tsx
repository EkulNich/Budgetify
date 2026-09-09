import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { RotatedViewPieChart } from "@/components/charts/rotated-view-pie-chart";
import { SpendingLineChart } from "@/components/charts/spending-line-chart";
import { HoursCalculator } from "@/components/hours-calculator";
import { StatCard, StatCardRow } from "@/components/stats/stat-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Spacing } from "@/constants/theme";
import { useCategories, type CategoryScope } from "@/hooks/data/use-categories";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useMonthlyExpenses, type MonthlyExpense } from "@/hooks/data/use-monthly-expenses";
import { useProfile } from "@/hooks/data/use-profile";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { formatCurrency } from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import {
  buildBudgetTrajectory,
  buildDailyCumulativeSeries,
  calculateAverageDailySpend,
  calculateCategoryChangePercent,
  calculatePercentSpent,
  calculateProjectedSpending,
  calculateSafeDailySpend,
} from "@/lib/stats";

const TEXT_GREY = "#7A7F87";
const PRIMARY_GREEN = "#2D612A";
const NEGATIVE_RED = "#C0392B";

const formatMonth = (month: Date) =>
  month.toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });

function daysInMonthOf(month: Date): number {
  return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
}

export default function StatsScreen() {
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const budget = Number(profile?.monthly_budget ?? 0);

  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const previousMonth = useMemo(
    () => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1),
    [selectedMonth],
  );
  const { expenses: currentExpenses } = useMonthlyExpenses(user?.id, selectedMonth);
  const { expenses: previousExpenses } = useMonthlyExpenses(user?.id, previousMonth);
  const { resolve, refetch: refetchCategories } = useCategories(user?.id);
  useFocusEffect(
    useCallback(() => {
      refetchCategories();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );
  const scopeForExpense = (e: MonthlyExpense): CategoryScope =>
    e.group_id !== null ? { type: "pool", poolId: e.group_id } : { type: "personal" };
  const scrollViewRef = useRef<ScrollView>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const today = new Date();
  const isCurrentMonth =
    selectedMonth.getFullYear() === today.getFullYear() &&
    selectedMonth.getMonth() === today.getMonth();
  const daysInMonth = daysInMonthOf(selectedMonth);
  const daysElapsed = isCurrentMonth
    ? today.getDate()
    : selectedMonth < today
      ? daysInMonth
      : 0;
  // Includes today — you still have today's allowance left to spend.
  const daysRemaining = isCurrentMonth ? daysInMonth - today.getDate() + 1 : 0;

  const convertedCurrent = useMemo(
    () =>
      currentExpenses.map((e) => ({
        ...e,
        amount: convert(Number(e.amount) || 0, e.currency, currency),
      })),
    [currentExpenses, convert, currency],
  );
  const convertedPrevious = useMemo(
    () =>
      previousExpenses.map((e) => ({
        ...e,
        amount: convert(Number(e.amount) || 0, e.currency, currency),
      })),
    [previousExpenses, convert, currency],
  );

  // Canonicalized by resolve()'s stable groupKey, not the raw stored string —
  // otherwise a renamed category (old strings still on old expenses) would
  // fragment into two separate lines instead of aggregating as one.
  const currentCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const meta: Record<string, { label: string; color: string }> = {};
    for (const e of convertedCurrent) {
      const resolved = resolve(e.category, scopeForExpense(e));
      totals[resolved.groupKey] = (totals[resolved.groupKey] ?? 0) + e.amount;
      meta[resolved.groupKey] = { label: resolved.label, color: resolved.color };
    }
    return { totals, meta };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertedCurrent, resolve]);

  const previousCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of convertedPrevious) {
      const resolved = resolve(e.category, scopeForExpense(e));
      totals[resolved.groupKey] = (totals[resolved.groupKey] ?? 0) + e.amount;
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertedPrevious, resolve]);

  const categoryData = useMemo(() => {
    return Object.entries(currentCategoryTotals.totals)
      .map(([groupKey, value]) => ({
        groupKey,
        label: currentCategoryTotals.meta[groupKey].label,
        value,
        color: currentCategoryTotals.meta[groupKey].color,
        changePercent: calculateCategoryChangePercent(
          value,
          previousCategoryTotals[groupKey] ?? 0,
        ),
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentCategoryTotals, previousCategoryTotals]);

  const totalSpent = categoryData.reduce((sum, item) => sum + item.value, 0);
  const previousTotalSpent = Object.values(previousCategoryTotals).reduce(
    (sum, v) => sum + v,
    0,
  );
  const remaining = budget - totalSpent;
  const percentSpent = calculatePercentSpent(totalSpent, budget);

  const dailySeries = useMemo(
    () => buildDailyCumulativeSeries(convertedCurrent, daysInMonth),
    [convertedCurrent, daysInMonth],
  );
  const actualSeries = isCurrentMonth ? dailySeries.slice(0, daysElapsed) : dailySeries;
  const trajectorySeries = useMemo(
    () => buildBudgetTrajectory(budget, daysInMonth),
    [budget, daysInMonth],
  );

  const projectedTotal = calculateProjectedSpending(totalSpent, daysElapsed, daysInMonth);
  const safeDailySpend = calculateSafeDailySpend(remaining, daysRemaining);
  const animatedSafeDailySpend = useAnimatedNumber(Math.max(safeDailySpend, 0));
  const currentAvgDailySpend = calculateAverageDailySpend(totalSpent, daysElapsed);
  const previousAvgDailySpend = calculateAverageDailySpend(
    previousTotalSpent,
    daysInMonthOf(previousMonth),
  );
  // "On track" only when the daily allowance comfortably covers what you've
  // actually been spending per day — not just whenever it's non-negative.
  const isOnTrack =
    isCurrentMonth && budget > 0 && safeDailySpend > 0 && safeDailySpend >= currentAvgDailySpend;

  const monthlySpendingChange = calculateCategoryChangePercent(totalSpent, previousTotalSpent);
  const budgetRemainingChange = calculateCategoryChangePercent(
    remaining,
    budget - previousTotalSpent,
  );
  const projectedSpendingChange = calculateCategoryChangePercent(
    projectedTotal,
    previousTotalSpent,
  );

  const insights = useMemo(
    () =>
      buildInsights({
        categoryTotals: categoryData.map((c) => ({
          label: c.label,
          current: c.value,
          previous: previousCategoryTotals[c.groupKey] ?? 0,
        })),
        currentAvgDailySpend,
        previousAvgDailySpend,
        projectedTotal,
        budget,
        currency,
      }),
    [
      categoryData,
      previousCategoryTotals,
      currentAvgDailySpend,
      previousAvgDailySpend,
      projectedTotal,
      budget,
      currency,
    ],
  );

  const moveMonth = (difference: number) => {
    setSelectedMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + difference, 1),
    );
  };

  const handleChartLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <ThemedText type="title" style={styles.title}>
                  Stats
                </ThemedText>
              </View>

              <View style={styles.monthSelector}>
                <TouchableOpacity
                  accessibilityLabel="Previous month"
                  style={styles.monthButton}
                  onPress={() => moveMonth(-1)}
                >
                  <ThemedText style={styles.monthButtonText}>‹</ThemedText>
                </TouchableOpacity>

                <ThemedText style={styles.monthText}>
                  {formatMonth(selectedMonth)}
                </ThemedText>

                <TouchableOpacity
                  accessibilityLabel="Next month"
                  style={styles.monthButton}
                  onPress={() => moveMonth(1)}
                >
                  <ThemedText style={styles.monthButtonText}>›</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <StatCardRow>
              <StatCard
                label="Monthly Spending"
                value={totalSpent}
                currency={currency}
                icon="spending"
                changePercent={monthlySpendingChange}
                changeGoodDirection="down"
              />
              <StatCard
                label="Budget Remaining"
                value={remaining}
                currency={currency}
                icon="remaining"
                valueColor={remaining < 0 ? NEGATIVE_RED : undefined}
                changePercent={budgetRemainingChange}
                changeGoodDirection="up"
              />
              <StatCard
                label="Projected Spending"
                value={projectedTotal}
                currency={currency}
                icon="projected"
                valueColor={
                  budget > 0 && projectedTotal > budget ? NEGATIVE_RED : undefined
                }
                changePercent={projectedSpendingChange}
                changeGoodDirection="down"
              />
            </StatCardRow>

            {isCurrentMonth && budget > 0 && (
              <Card style={styles.safeSpendCard}>
                <Svg
                  width={140}
                  height={90}
                  viewBox="0 0 140 90"
                  style={styles.safeSpendIllustration}
                >
                  <Circle cx={40} cy={30} r={16} fill="#ffffff" opacity={0.1} />
                  <Circle cx={58} cy={24} r={11} fill="#ffffff" opacity={0.1} />
                  <Path d="M70 90 L100 40 L118 65 L132 90 Z" fill="#ffffff" opacity={0.1} />
                  <Path d="M95 90 L118 52 L140 90 Z" fill="#ffffff" opacity={0.16} />
                  <Line
                    x1={118}
                    y1={52}
                    x2={118}
                    y2={30}
                    stroke="#ffffff"
                    strokeWidth={1.6}
                    opacity={0.5}
                  />
                  <Path d="M118 30 L131 35 L118 40 Z" fill="#ffffff" opacity={0.7} />
                </Svg>

                <ThemedText style={styles.safeSpendLabel}>Safe to spend</ThemedText>
                <ThemedText
                  style={styles.safeSpendValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {formatCurrency(animatedSafeDailySpend, currency)}
                  <ThemedText style={styles.safeSpendUnit}> / day</ThemedText>
                </ThemedText>
                <ThemedText style={styles.safeSpendSubtext}>
                  {remaining >= 0
                    ? `${formatCurrency(remaining, currency)} left over ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
                    : `You're ${formatCurrency(-remaining, currency)} over budget already`}
                </ThemedText>
                {isOnTrack && (
                  <View style={styles.onTrackPill}>
                    <ThemedText style={styles.onTrackText}>You're on track! 🎉</ThemedText>
                  </View>
                )}
              </Card>
            )}

            <ThemedView style={styles.divider} />

            <View>
              <SectionLabel style={{ color: TEXT_GREY }}>
                Spending Over Time
              </SectionLabel>
              <Card style={styles.chartCard} onLayout={handleChartLayout}>
                {chartWidth > 0 && (
                  <SpendingLineChart
                    actual={actualSeries}
                    trajectory={trajectorySeries}
                    daysInMonth={daysInMonth}
                    width={chartWidth}
                  />
                )}
              </Card>
            </View>

            <ThemedView style={styles.divider} />

            <View>
              <SectionLabel style={{ color: TEXT_GREY }}>
                Spending Breakdown
              </SectionLabel>

              {categoryData.length > 0 ? (
                <View style={styles.breakdownContainer}>
                  <View style={styles.chartWrapper}>
                    <RotatedViewPieChart data={categoryData} />
                  </View>

                  <View style={styles.legend}>
                    {categoryData.map((item) => {
                      const percentage = totalSpent
                        ? Math.round((item.value / totalSpent) * 100)
                        : 0;

                      return (
                        <View key={item.groupKey} style={styles.legendRow}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: item.color },
                            ]}
                          />
                          <ThemedText style={styles.legendLabel}>
                            {item.label.charAt(0).toUpperCase() +
                              item.label.slice(1)}
                            {` (${percentage}%)`}
                          </ThemedText>
                          {item.changePercent !== null && (
                            <ThemedText
                              style={[
                                styles.legendChange,
                                {
                                  color:
                                    item.changePercent > 0
                                      ? NEGATIVE_RED
                                      : PRIMARY_GREEN,
                                },
                              ]}
                            >
                              {item.changePercent > 0 ? "+" : ""}
                              {Math.round(item.changePercent)}%
                            </ThemedText>
                          )}
                          <ThemedText style={styles.legendAmount}>
                            {formatCurrency(item.value, currency)}
                          </ThemedText>
                        </View>
                      );
                    })}

                    <View style={[styles.legendRow, styles.totalRow]}>
                      <ThemedText
                        style={[styles.legendLabel, styles.totalText]}
                      >
                        Total
                      </ThemedText>
                      <ThemedText
                        style={[styles.legendAmount, styles.totalText]}
                      >
                        {formatCurrency(totalSpent, currency)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ) : (
                <ThemedText style={styles.emptyText}>
                  No expenses recorded for {formatMonth(selectedMonth)}.
                </ThemedText>
              )}
            </View>

            {insights.length > 0 && (
              <>
                <ThemedView style={styles.divider} />
                <View>
                  <SectionLabel style={{ color: TEXT_GREY }}>Insights</SectionLabel>
                  <View style={styles.insightsList}>
                    {insights.map((insight, index) => (
                      <View key={index} style={styles.insightRow}>
                        <View
                          style={[
                            styles.insightDot,
                            {
                              backgroundColor:
                                insight.tone === "positive"
                                  ? PRIMARY_GREEN
                                  : insight.tone === "negative"
                                    ? NEGATIVE_RED
                                    : TEXT_GREY,
                            },
                          ]}
                        />
                        <ThemedText style={styles.insightText}>
                          {insight.text}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            <ThemedView style={styles.divider} />

            <HoursCalculator
              savedSalary={profile?.monthly_salary ?? null}
              savedHours={profile?.hours_per_week ?? null}
              scrollViewRef={scrollViewRef}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four + 24,
  },
  title: { color: PRIMARY_GREEN },
  divider: {
    height: 1,
    backgroundColor: "#D7D9DC",
    marginVertical: Spacing.one,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#EDEDED",
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginTop: 6,
  },
  monthButton: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonText: {
    color: TEXT_GREY,
    fontSize: 20,
    lineHeight: 22,
  },
  monthText: {
    color: "#23262B",
    fontSize: 14,
    fontWeight: "600",
  },
  safeSpendCard: {
    backgroundColor: PRIMARY_GREEN,
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
  },
  safeSpendIllustration: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  safeSpendLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#D7E9D2",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  safeSpendValue: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  safeSpendUnit: {
    fontSize: 14,
    lineHeight: 36,
    fontWeight: "600",
    color: "#D7E9D2",
  },
  safeSpendSubtext: {
    fontSize: 12,
    color: "#D7E9D2",
  },
  onTrackPill: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff26",
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    marginTop: Spacing.two,
  },
  onTrackText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chartCard: {
    marginTop: Spacing.two,
  },
  breakdownContainer: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  chartWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  legend: { width: "100%", gap: Spacing.two },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: Spacing.two,
    minHeight: 24,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: TEXT_GREY,
  },
  legendChange: {
    fontSize: 12,
    fontWeight: "700",
  },
  legendAmount: {
    width: 90,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_GREY,
  },
  totalRow: {
    marginTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: Spacing.two,
  },
  totalText: { fontWeight: "700" },
  emptyText: {
    color: TEXT_GREY,
    textAlign: "center",
    marginVertical: Spacing.four,
  },
  insightsList: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: "#3A3F45",
    lineHeight: 18,
  },
});
