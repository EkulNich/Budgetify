import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { CATEGORIES } from "@/constants/categories";
import { Spacing } from "@/constants/theme";
import type { PoolExpense } from "@/hooks/data/use-pool-expenses";
import { formatCurrency } from "@/lib/format";

type PoolExpenseRowProps = {
  expense: PoolExpense;
  onDelete: (expense: PoolExpense) => void;
};

function getCategoryLabelAndColor(category: string | null) {
  const match = CATEGORIES.find((c) => c.key === category?.toLowerCase());
  if (match) return { label: match.label, color: match.color };
  if (category) return { label: category, color: "#888" };
  return null;
}

export function PoolExpenseRow({ expense, onDelete }: PoolExpenseRowProps) {
  const isSplit = !!expense.split_between && expense.split_between.length > 1;
  const category = getCategoryLabelAndColor(expense.category);

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
            {formatCurrency(expense.amount, expense.currency)}
          </ThemedText>
        </View>
        {category && (
          <View
            style={[styles.categoryBadge, { backgroundColor: category.color + "22" }]}
          >
            <ThemedText style={[styles.categoryBadgeText, { color: category.color }]}>
              {category.label}
            </ThemedText>
          </View>
        )}
        {isSplit ? (
          <View style={styles.splitList}>
            <ThemedText style={{ color: "#888", fontSize: 12, marginBottom: 2 }}>
              Split between:
            </ThemedText>
            {expense.split_usernames.map((u, i) => (
              <ThemedText key={i} style={{ color: "#888", fontSize: 12 }}>
                • {u} —{" "}
                {formatCurrency(
                  expense.amount / expense.split_between!.length,
                  expense.currency,
                )}
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
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    marginBottom: 2,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deleteBtn: {
    width: 80,
    marginBottom: 2,
  },
});
