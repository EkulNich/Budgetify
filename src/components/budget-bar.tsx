import { StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

type BudgetBarProps = {
  spendingLimit: number;
  outflow: number;
  streak: number;
};

const format = (n: number) => {
  const [whole, decimal] = n.toFixed(2).split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + decimal;
};

export function BudgetBar({ spendingLimit, outflow, streak }: BudgetBarProps) {
  if (spendingLimit === undefined || outflow === undefined) return null;
  const remaining = spendingLimit - outflow;
  const percent = outflow / spendingLimit;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <ThemedText>AMOUNT REMAINING</ThemedText>
        <ThemedText> STREAK 🔥 : {streak}</ThemedText>
      </View>
      <ThemedText type="title">${format(remaining)}</ThemedText>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent * 100}%` }]} />
      </View>

      <View style={styles.row}>
        <ThemedText>Budget: ${format(spendingLimit)}</ThemedText>
        <ThemedText>{(percent * 100).toFixed(1)}% spent</ThemedText>
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
  track: {
    height: 6,
    backgroundColor: "#4a8c6a",
    borderRadius: 3,
  },
  fill: {
    height: 6,
    backgroundColor: "#90EE90",
    borderRadius: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
