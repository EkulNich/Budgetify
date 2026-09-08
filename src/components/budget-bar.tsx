import { StyleSheet, View } from "react-native";
import { AnimatedProgressBar } from "@/components/ui/animated-progress-bar";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { formatCurrency } from "@/lib/format";
import { calculatePercentSpent } from "@/lib/stats";
import { ThemedText } from "./themed-text";

type BudgetBarProps = {
  spendingLimit: number;
  outflow: number;
  streak: number;
  currency: string;
};

export function BudgetBar({ spendingLimit, outflow, streak, currency }: BudgetBarProps) {
  const remaining = spendingLimit - outflow;
  const percentSpent = calculatePercentSpent(outflow, spendingLimit);
  const animatedRemaining = useAnimatedNumber(remaining);
  const animatedOutflow = useAnimatedNumber(outflow);
  const animatedPercent = useAnimatedNumber(percentSpent);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <ThemedText style={styles.label}>AMOUNT REMAINING</ThemedText>
        <ThemedText style={styles.label}>STREAK 🔥 {streak}</ThemedText>
      </View>
      <ThemedText type="title">{formatCurrency(animatedRemaining, currency)}</ThemedText>

      <AnimatedProgressBar
        progress={percentSpent / 100}
        color="#90EE90"
        trackColor="#4a8c6a"
        height={6}
      />

      <View style={styles.row}>
        <View>
          <ThemedText style={styles.spentText}>
            {formatCurrency(animatedOutflow, currency)} spent
          </ThemedText>
          <ThemedText style={styles.ofBudgetText}>
            of {formatCurrency(spendingLimit, currency)}
          </ThemedText>
        </View>
        <ThemedText style={styles.percentText}>{animatedPercent.toFixed(1)}% spent</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2D612A",
    padding: 16,
    borderRadius: 16,
    gap: 8,
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#D7E9D2",
  },
  spentText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ofBudgetText: {
    fontSize: 13,
    color: "#B9D8B4",
    marginTop: 1,
  },
  percentText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
