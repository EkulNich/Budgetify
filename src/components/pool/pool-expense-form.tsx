import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { SelectOption } from "@/components/ui/select-modal";
import { CATEGORIES, type CategoryKey } from "@/constants/categories";
import { CURRENCIES } from "@/constants/currencies";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import { formatCurrency } from "@/lib/format";

export type PoolExpenseFormValue = {
  description: string;
  amount: string;
  currency: string;
  category: CategoryKey | null;
  selectedMembers: Set<string>;
};

/** An empty form, defaulting its currency to the relevant profile/pool default. */
export function makeEmptyPoolExpenseForm(
  defaultCurrency: string,
): PoolExpenseFormValue {
  return {
    description: "",
    amount: "",
    currency: defaultCurrency,
    category: null,
    selectedMembers: new Set(["split"]),
  };
}

export const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

type PoolExpenseFormProps = {
  members: PoolMember[];
  colors: ThemeColors;
  value: PoolExpenseFormValue;
  onChange: (value: PoolExpenseFormValue) => void;
  /** Shows the "assign to" split picker. Off for a personal (non-group) expense. */
  showAssignTo?: boolean;
  /**
   * Opens the currency picker. Rendering the actual picker is left to the
   * caller (see `CURRENCY_OPTIONS`) — it must live inside the same full-screen
   * container as any wrapping `Modal`, not nested inside this form's own
   * (much smaller) layout box, or it won't cover the screen correctly.
   */
  onOpenCurrencyPicker: () => void;
};

/**
 * The one expense-entry form used everywhere an expense is added — personal or
 * group-pool — so the layout, spacing, and chip styling are always identical.
 * Field order: category, description, amount (+ currency), then (for a group)
 * who it's split between.
 */
export function PoolExpenseForm({
  members,
  colors,
  value,
  onChange,
  showAssignTo = true,
  onOpenCurrencyPicker,
}: PoolExpenseFormProps) {
  const { description, amount, currency, category, selectedMembers } = value;

  const toggleMember = (userId: string) => {
    const next = new Set(selectedMembers);
    next.delete("split");
    if (next.has(userId)) {
      next.delete(userId);
      if (next.size === 0) next.add("split");
    } else {
      next.add(userId);
    }
    onChange({ ...value, selectedMembers: next });
  };

  const toggleSplitAll = () =>
    onChange({ ...value, selectedMembers: new Set(["split"]) });

  return (
    <View style={styles.container}>
      <View>
        <ThemedText
          style={[styles.label, { color: colors.backgroundElement }]}
        >
          Category
        </ThemedText>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const selected = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.chip,
                  { borderColor: colors.backgroundElement },
                  selected && { backgroundColor: colors.backgroundElement },
                ]}
                onPress={() => onChange({ ...value, category: c.key })}
              >
                <ThemedText
                  style={{
                    color: selected ? "#fff" : colors.backgroundElement,
                    fontSize: 13,
                  }}
                >
                  {c.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TextInput
        style={[
          styles.input,
          { borderColor: colors.backgroundElement, color: colors.backgroundElement },
        ]}
        placeholder="Description"
        placeholderTextColor="#888"
        value={description}
        onChangeText={(text) => onChange({ ...value, description: text })}
      />

      <View style={styles.amountRow}>
        <TextInput
          style={[
            styles.input,
            styles.amountInput,
            { borderColor: colors.backgroundElement, color: colors.backgroundElement },
          ]}
          placeholder="Amount"
          placeholderTextColor="#888"
          value={amount}
          onChangeText={(text) => onChange({ ...value, amount: text })}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.currencyButton, { borderColor: colors.backgroundElement }]}
          onPress={onOpenCurrencyPicker}
        >
          <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
            {currency}
          </ThemedText>
          <ThemedText style={{ color: colors.backgroundElement }}>▾</ThemedText>
        </TouchableOpacity>
      </View>

      {showAssignTo && (
        <View>
          <ThemedText
            style={[styles.label, { color: colors.backgroundElement }]}
          >
            Assign to
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { borderColor: colors.backgroundElement },
                  selectedMembers.has("split") && {
                    backgroundColor: colors.backgroundElement,
                  },
                ]}
                onPress={toggleSplitAll}
              >
                <ThemedText
                  style={{
                    color: selectedMembers.has("split") ? "#fff" : colors.backgroundElement,
                    fontSize: 13,
                  }}
                >
                  Split all
                </ThemedText>
              </TouchableOpacity>
              {members.map((m) => {
                const selected = selectedMembers.has(m.user_id);
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    style={[
                      styles.chip,
                      { borderColor: colors.backgroundElement },
                      selected && { backgroundColor: colors.backgroundElement },
                    ]}
                    onPress={() => toggleMember(m.user_id)}
                  >
                    <ThemedText
                      style={{
                        color: selected ? "#fff" : colors.backgroundElement,
                        fontSize: 13,
                      }}
                    >
                      {m.username}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          {!selectedMembers.has("split") && selectedMembers.size > 0 && (
            <ThemedText style={{ color: "#888", fontSize: 12 }}>
              {formatCurrency(
                parseFloat(amount || "0") / selectedMembers.size,
                currency,
              )}{" "}
              each ({selectedMembers.size}{" "}
              {selectedMembers.size === 1 ? "person" : "people"})
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  label: {
    fontWeight: "600",
    fontSize: 13,
    marginBottom: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  amountRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  amountInput: {
    flex: 1,
  },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
