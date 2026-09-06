import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RotatedViewPieChart } from "@/components/charts/rotated-view-pie-chart";
import { HoursCalculator } from "@/components/hours-calculator";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SectionLabel } from "@/components/ui/section-label";
import { getCategoryColorMap } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { useMonthlyExpenses } from "@/hooks/data/use-monthly-expenses";
import { useProfile } from "@/hooks/data/use-profile";
import { formatCurrency } from "@/lib/format";

const TEXT_GREY = "#7A7F87";
const PRIMARY_GREEN = "#2D612A";

const formatMonth = (month: Date) =>
  month.toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });

export default function StatsScreen() {
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const currency = profile?.currency ?? "SGD";
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const { expenses } = useMonthlyExpenses(user?.id, selectedMonth);
  const scrollViewRef = useRef<ScrollView>(null);

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const expense of expenses) {
      const key = expense.category ?? "others";
      // Almost always already in `currency` (the common case); only rows from
      // before a currency change need converting.
      const amount = convert(Number(expense.amount) || 0, expense.currency, currency);
      totals[key] = (totals[key] ?? 0) + amount;
    }

    const entries = Object.entries(totals);
    const categoryColorMap = getCategoryColorMap(entries.map(([label]) => label));

    return entries.map(([label, value]) => ({
      label,
      value,
      color: categoryColorMap[label],
    }));
  }, [expenses, convert, currency]);

  const moveMonth = (difference: number) => {
    setSelectedMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + difference, 1),
    );
  };

  const totalSpent = categoryData.reduce((sum, item) => sum + item.value, 0);

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
            <ThemedText type="title" style={styles.title}>
              Stats
            </ThemedText>

            <ThemedView style={styles.divider} />

            <View>
              <SectionLabel style={{ color: TEXT_GREY }}>
                Spending Breakdown
              </SectionLabel>

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
                        <View key={item.label} style={styles.legendRow}>
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
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.two,
  },
  monthButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonText: {
    color: TEXT_GREY,
    fontSize: 30,
    lineHeight: 32,
  },
  monthText: {
    color: TEXT_GREY,
    fontSize: 16,
    fontWeight: "600",
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
  legendAmount: {
    width: 110,
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
});
