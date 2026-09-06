import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { Spacing } from "@/constants/theme";
import type { PoolExpense } from "@/hooks/data/use-pool-expenses";
import { formatCurrency } from "@/lib/format";

type PoolExpenseRowProps = {
  expense: PoolExpense;
  onDelete: (expense: PoolExpense) => void;
};

export function PoolExpenseRow({ expense, onDelete }: PoolExpenseRowProps) {
  const isSplit = !!expense.split_between && expense.split_between.length > 1;

  return (
    <SwipeableRow
      confirmTitle="Delete Expense"
      confirmMessage={
        isSplit
          ? "This will delete the expense for all members it was split between."
          : "Are you sure you want to delete this expense?"
      }
      deleteButtonStyle={styles.deleteBtn}
      onDelete={() => onDelete(expense)}
    >
      <View style={[styles.expenseCard, { backgroundColor: "#2D612A15" }]}>
        <View style={styles.expenseTop}>
          <ThemedText
            style={{ color: "#2D612A", fontWeight: "600", fontSize: 15 }}
          >
            {expense.description}
          </ThemedText>
          <ThemedText
            style={{ color: "#2D612A", fontWeight: "700", fontSize: 15 }}
          >
            ${formatCurrency(expense.amount)}
          </ThemedText>
        </View>
        {isSplit ? (
          <View style={styles.splitList}>
            <ThemedText style={{ color: "#888", fontSize: 12, marginBottom: 2 }}>
              Split between:
            </ThemedText>
            {expense.split_usernames.map((u, i) => (
              <ThemedText key={i} style={{ color: "#888", fontSize: 12 }}>
                • {u} — $
                {formatCurrency(expense.amount / expense.split_between!.length)}
              </ThemedText>
            ))}
          </View>
        ) : (
          <ThemedText style={{ color: "#888", fontSize: 12 }}>
            {expense.added_by_username}
          </ThemedText>
        )}
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  expenseCard: { borderRadius: 12, padding: Spacing.three, marginBottom: 2 },
  expenseTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  splitList: { marginTop: 4, gap: 2 },
  deleteBtn: {
    width: 80,
    marginBottom: 2,
  },
});
