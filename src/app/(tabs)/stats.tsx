import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

const TEXT_GREY = "#7A7F87";
const PRIMARY_GREEN = "#2D612A";

const CATEGORY_COLORS: Record<string, string> = {
  food: "#4CAF50",
  transport: "#2196F3",
  entertainment: "#FF9800",
  loans: "#F44336",
  others: "#9C27B0",
};

const CUSTOM_CATEGORY_COLORS = [
  "#00ACC1",
  "#7E57C2",
  "#EC407A",
  "#8D6E63",
  "#26A69A",
  "#5C6BC0",
  "#D4A017",
  "#AB47BC",
  "#78909C",
  "#66BB6A",
  "#EF6C00",
  "#42A5F5",
];

const getCategoryColorMap = (categories: string[]) => {
  const colorMap: Record<string, string> = {};
  let customColorIndex = 0;

  for (const category of categories) {
    const key = category.toLowerCase().trim();
    const standardColor = CATEGORY_COLORS[key];

    if (standardColor) {
      colorMap[category] = standardColor;
      continue;
    }

    colorMap[category] =
      CUSTOM_CATEGORY_COLORS[customColorIndex % CUSTOM_CATEGORY_COLORS.length];
    customColorIndex += 1;
  }

  return colorMap;
};

const getMonthRange = (month: Date) => {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

const formatMonth = (month: Date) =>
  month.toLocaleDateString("en-SG", {
    month: "long",
    year: "numeric",
  });

function NativePieChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const size = 220;
  const radius = size / 2;
  const segmentCount = 240;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) return null;

  const cumulative: { end: number; color: string }[] = [];
  let runningTotal = 0;

  for (const item of data) {
    runningTotal += item.value / total;
    cumulative.push({ end: runningTotal, color: item.color });
  }

  return (
    <View style={[styles.pieChart, { width: size, height: size }]}>
      {Array.from({ length: segmentCount }, (_, index) => {
        const position = (index + 0.5) / segmentCount;
        const slice =
          cumulative.find((item) => position <= item.end) ??
          cumulative[cumulative.length - 1];

        return (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.pieSegmentWrapper,
              {
                width: size,
                height: size,
                transform: [{ rotate: `${(index * 360) / segmentCount}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.pieSegment,
                {
                  left: radius,
                  top: radius - 1.5,
                  width: radius + 1,
                  backgroundColor: slice.color,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function StatsScreen() {
  const [savedSalary, setSavedSalary] = useState<number | null>(null);
  const [savedHours, setSavedHours] = useState<number | null>(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [categoryData, setCategoryData] = useState<
    { label: string; value: number; color: string }[]
  >([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const resultYRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("monthly_salary, hours_per_week")
          .eq("id", user.id)
          .single();

        if (profile) {
          setSavedSalary(profile.monthly_salary);
          setSavedHours(profile.hours_per_week);
        }

        const { start, end } = getMonthRange(selectedMonth);

        const { data: expenses, error } = await supabase
          .from("expenses")
          .select("amount, category, created_at")
          .eq("user_id", user.id)
          .gte("created_at", start)
          .lt("created_at", end);

        if (error) {
          console.error("Failed to load monthly expenses:", error.message);
          setCategoryData([]);
          return;
        }

        const totals: Record<string, number> = {};

        for (const expense of expenses ?? []) {
          const key = expense.category ?? "others";
          const amount = Number(expense.amount) || 0;
          totals[key] = (totals[key] ?? 0) + amount;
        }

        const entries = Object.entries(totals);
        const categoryColorMap = getCategoryColorMap(
          entries.map(([label]) => label),
        );

        const chartData = entries.map(([label, value]) => ({
          label,
          value,
          color: categoryColorMap[label],
        }));

        setCategoryData(chartData);
      };

      fetchData();
    }, [selectedMonth]),
  );

  const moveMonth = (difference: number) => {
    setSelectedMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + difference, 1),
    );
  };

  const handleCalculate = () => {
    const amount = parseFloat(expenseAmount);

    if (!savedSalary || !savedHours) {
      Alert.alert(
        "Error",
        "Please save your salary and hours in the Profile tab first.",
      );
      return;
    }

    if (!amount || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    const monthlyHours = (savedHours * 52) / 12;
    const hourlyRate = savedSalary / monthlyHours;

    Keyboard.dismiss();
    resultYRef.current = null;
    setHoursNeeded(amount / hourlyRate);
  };

  const getBreakdown = (hoursWorked: number) => {
    const totalMinutes = Math.round(hoursWorked * 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hoursPerDay = savedHours
      ? Math.max(1, Math.round(savedHours / 5))
      : 8;
    const days = Math.floor(totalHours / hoursPerDay);
    const remainingHours = totalHours % hoursPerDay;

    return { minutes, hours: remainingHours, days };
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
              <ThemedText style={styles.sectionLabel}>
                Spending Breakdown
              </ThemedText>

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
                    <NativePieChart data={categoryData} />
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
                            ${item.value.toFixed(2)}
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
                        ${totalSpent.toFixed(2)}
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

            <ThemedText style={styles.sectionLabel}>
              How long do I need to work for...
            </ThemedText>

            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor="#B0B4BA"
              keyboardType="numeric"
              value={expenseAmount}
              onChangeText={(value) => {
                setExpenseAmount(value);
                setHoursNeeded(null);
              }}
              onFocus={() => {
                setTimeout(
                  () => scrollViewRef.current?.scrollToEnd({ animated: true }),
                  150,
                );
              }}
              returnKeyType="done"
            />

            <TouchableOpacity style={styles.button} onPress={handleCalculate}>
              <ThemedText style={styles.buttonText}>Calculate</ThemedText>
            </TouchableOpacity>

            {hoursNeeded !== null &&
              (() => {
                const { minutes, hours, days } = getBreakdown(hoursNeeded);

                return (
                  <ThemedView
                    style={styles.resultCard}
                    onLayout={({ nativeEvent: { layout } }) => {
                      // Copy the numeric position immediately. React may release the
                      // synthetic event before the delayed callback runs.
                      const resultY = layout.y;
                      resultYRef.current = resultY;

                      // Allow the keyboard dismissal and layout update to finish,
                      // then bring the completed calculation into view.
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({
                          y: Math.max(0, resultY - Spacing.three),
                          animated: true,
                        });
                      }, 200);
                    }}
                  >
                    <ThemedText style={styles.resultLabel}>
                      You need to work
                    </ThemedText>

                    <ThemedView style={styles.resultRow}>
                      {days > 0 && (
                        <ThemedView style={styles.resultUnit}>
                          <ThemedText style={styles.resultValue}>
                            {days}
                          </ThemedText>
                          <ThemedText style={styles.resultUnitLabel}>
                            {days === 1 ? "day" : "days"}
                          </ThemedText>
                        </ThemedView>
                      )}

                      {hours > 0 && (
                        <ThemedView style={styles.resultUnit}>
                          <ThemedText style={styles.resultValue}>
                            {hours}
                          </ThemedText>
                          <ThemedText style={styles.resultUnitLabel}>
                            {hours === 1 ? "hour" : "hours"}
                          </ThemedText>
                        </ThemedView>
                      )}

                      {minutes > 0 && (
                        <ThemedView style={styles.resultUnit}>
                          <ThemedText style={styles.resultValue}>
                            {minutes}
                          </ThemedText>
                          <ThemedText style={styles.resultUnitLabel}>
                            {minutes === 1 ? "min" : "mins"}
                          </ThemedText>
                        </ThemedView>
                      )}
                    </ThemedView>
                  </ThemedView>
                );
              })()}
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_GREY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
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
  pieChart: {
    position: "relative",
    borderRadius: 110,
    overflow: "hidden",
  },
  pieSegmentWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  pieSegment: {
    position: "absolute",
    height: 3,
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
    width: 88,
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
  input: {
    borderWidth: 1,
    borderColor: "#D7D9DC",
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
    color: TEXT_GREY,
  },
  button: {
    backgroundColor: PRIMARY_GREEN,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF" },
  resultCard: {
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: "#D7D9DC",
  },
  resultLabel: { fontSize: 16, color: TEXT_GREY },
  resultRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.four,
    paddingBottom: 16,
  },
  resultUnit: { alignItems: "center", gap: 4 },
  resultValue: {
    fontSize: 52,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    lineHeight: 64,
  },
  resultUnitLabel: { fontSize: 14, color: TEXT_GREY },
});
