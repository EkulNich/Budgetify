import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

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

const CATEGORY_ICON_NAMES: Record<CategoryKey, keyof typeof Ionicons.glyphMap> = {
  food: "fast-food-outline",
  transport: "car-outline",
  entertainment: "game-controller-outline",
  loans: "card-outline",
  others: "ellipsis-horizontal-circle-outline",
};

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
 * Each field group is its own white card, in the order: amount, description,
 * category, then (for a group) who it's split between.
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
  const isSplitAll = selectedMembers.has("split");

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
      {/* Amount */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <ThemedText style={[styles.cardTitle, { color: colors.backgroundElement }]}>
            Amount
          </ThemedText>
          <TouchableOpacity style={styles.currencyInline} onPress={onOpenCurrencyPicker}>
            <ThemedText style={{ color: "#888", fontSize: 13 }}>Currency:</ThemedText>
            <ThemedText
              style={{ color: colors.backgroundElement, fontWeight: "700", fontSize: 13 }}
            >
              {currency}
            </ThemedText>
            <ThemedText style={{ color: colors.backgroundElement, fontSize: 11 }}>▾</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={[
            styles.iconInputRow,
            { borderColor: colors.backgroundElement, backgroundColor: colors.backgroundElement + "0D" },
          ]}>
          <ThemedText style={{ color: "#888", fontSize: 18, fontWeight: "700" }}>$</ThemedText>
          <TextInput
            style={[styles.iconInputField, styles.amountInputText, { color: colors.backgroundElement }]}
            placeholder="0.00"
            placeholderTextColor="#B0B4BA"
            value={amount}
            onChangeText={(text) => onChange({ ...value, amount: text })}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Description */}
      <View style={styles.card}>
        <ThemedText style={[styles.cardTitle, { color: colors.backgroundElement }]}>
          Description
        </ThemedText>
        <View style={[
            styles.iconInputRow,
            { borderColor: colors.backgroundElement, backgroundColor: colors.backgroundElement + "0D" },
          ]}>
          <Ionicons name="document-text-outline" size={16} color="#888" />
          <TextInput
            style={[styles.iconInputField, { color: colors.backgroundElement }]}
            placeholder="What did you spend on?"
            placeholderTextColor="#888"
            value={description}
            onChangeText={(text) => onChange({ ...value, description: text })}
          />
        </View>
      </View>

      {/* Category */}
      <View style={styles.card}>
        <ThemedText style={[styles.cardTitle, { color: colors.backgroundElement }]}>
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
                <Ionicons
                  name={CATEGORY_ICON_NAMES[c.key]}
                  size={14}
                  color={selected ? "#fff" : colors.backgroundElement}
                />
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

      {showAssignTo && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.splitLabelRow}>
              <ThemedText style={[styles.cardTitle, { color: colors.backgroundElement }]}>
                Split among
              </ThemedText>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Split among",
                    "Split equally divides the amount evenly across everyone selected below.",
                  )
                }
              >
                <Ionicons name="information-circle-outline" size={16} color="#B0B4BA" />
              </TouchableOpacity>
            </View>
            <View style={[styles.splitToggle, { backgroundColor: colors.backgroundElement + "0D" }]}>
              <View style={[styles.splitToggleOption, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText style={{ fontSize: 12.5, fontWeight: "700", color: "#fff" }}>
                  Split equally
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.splitToggleOption}
                onPress={() =>
                  Alert.alert(
                    "Custom split",
                    "Splitting by a custom amount per person isn't available yet — for now every expense is split equally.",
                  )
                }
              >
                <ThemedText style={{ fontSize: 12.5, fontWeight: "700", color: "#7A7F87" }}>
                  Custom
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

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
                  isSplitAll && { backgroundColor: colors.backgroundElement },
                ]}
                onPress={toggleSplitAll}
              >
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={isSplitAll ? "#fff" : colors.backgroundElement}
                />
                <ThemedText
                  style={{
                    color: isSplitAll ? "#fff" : colors.backgroundElement,
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
                    <Ionicons
                      name="person-outline"
                      size={13}
                      color={selected ? "#fff" : colors.backgroundElement}
                    />
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
          {!isSplitAll && selectedMembers.size > 0 && (
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
    gap: Spacing.two,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 15,
  },
  currencyInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  splitLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  splitToggle: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
  },
  splitToggleOption: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  iconInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
  },
  iconInputField: {
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  amountInputText: {
    fontSize: 20,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
