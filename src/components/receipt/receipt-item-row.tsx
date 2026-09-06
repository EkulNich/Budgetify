import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { CATEGORIES } from "@/constants/categories";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import type { ReviewItem } from "./review-item";

type ReceiptItemRowProps = {
  item: ReviewItem;
  colors: ThemeColors;
  onChange: (item: ReviewItem) => void;
  /** Pool members, for rendering the current assignment. Omit for individual mode. */
  members?: PoolMember[];
  onOpenAssign?: () => void;
};

export function ReceiptItemRow({
  item,
  colors,
  onChange,
  members,
  onOpenAssign,
}: ReceiptItemRowProps) {
  const showAssignment = members !== undefined;

  const assignedNames = showAssignment
    ? members!.filter((m) => item.assignedTo.has(m.user_id)).map((m) => m.username)
    : [];
  const isSplitAll =
    showAssignment && members!.length > 0 && item.assignedTo.size === members!.length;

  return (
    <View style={styles.card}>
      <TextInput
        style={[styles.nameInput, { color: colors.backgroundElement }]}
        value={item.name}
        onChangeText={(text) => onChange({ ...item, name: text })}
        placeholder="Item name"
        placeholderTextColor="#888"
      />

      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => {
          const selected = item.category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.chip,
                { borderColor: colors.backgroundElement },
                selected && { backgroundColor: colors.backgroundElement },
              ]}
              onPress={() => onChange({ ...item, category: c.key })}
            >
              <ThemedText
                style={{ color: selected ? "#fff" : colors.backgroundElement, fontSize: 12 }}
              >
                {c.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomRow}>
        <View style={[styles.priceRow, { borderColor: colors.backgroundElement }]}>
          <ThemedText style={{ color: colors.backgroundElement }}>$</ThemedText>
          <TextInput
            style={[styles.priceInput, { color: colors.backgroundElement }]}
            value={item.price}
            onChangeText={(text) => onChange({ ...item, price: text })}
            keyboardType="numeric"
          />
        </View>

        {showAssignment && (
          <TouchableOpacity
            style={[
              styles.assignPill,
              item.assignedTo.size === 0
                ? { borderColor: "#C0392B", backgroundColor: "#C0392B14" }
                : { borderColor: colors.backgroundElement },
            ]}
            onPress={onOpenAssign}
          >
            <ThemedText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: item.assignedTo.size === 0 ? "#C0392B" : colors.backgroundElement,
              }}
            >
              {item.assignedTo.size === 0
                ? "Unassigned"
                : isSplitAll
                  ? "Split all"
                  : assignedNames.join(" + ")}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  nameInput: {
    fontSize: 15,
    fontWeight: "600",
    padding: 0,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    gap: 2,
  },
  priceInput: {
    fontSize: 15,
    fontWeight: "700",
    padding: Spacing.one,
    minWidth: 60,
  },
  assignPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
