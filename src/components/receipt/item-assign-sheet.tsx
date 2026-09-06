import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { modalStyles } from "@/components/ui/modal-styles";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import { formatCurrency } from "@/lib/format";

type ItemAssignSheetProps = {
  visible: boolean;
  itemName: string;
  price: number;
  currency: string;
  members: PoolMember[];
  assignedTo: Set<string>;
  colors: ThemeColors;
  onChange: (assignedTo: Set<string>) => void;
  onClose: () => void;
};

/**
 * A bottom-sheet picker for assigning one scanned item to a pool member or
 * several. A plain overlay (not `Modal`) — see `SelectModal` for why: this is
 * opened from inside the already-open "Review Receipt" screen, and stacking
 * two native Modals can leave the app's touch input dead after this closes.
 */
export function ItemAssignSheet({
  visible,
  itemName,
  price,
  currency,
  members,
  assignedTo,
  colors,
  onChange,
  onClose,
}: ItemAssignSheetProps) {
  if (!visible) return null;

  const toggleMember = (userId: string) => {
    const next = new Set(assignedTo);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    onChange(next);
  };

  const toggleSplitAll = () => {
    const allSelected = members.every((m) => assignedTo.has(m.user_id));
    onChange(allSelected ? new Set() : new Set(members.map((m) => m.user_id)));
  };

  const isSplitAll =
    members.length > 0 && members.every((m) => assignedTo.has(m.user_id));

  return (
    <View style={styles.overlay}>
      <View style={[modalStyles.modalCard, { backgroundColor: "#fff" }]}>
        <View>
          <ThemedText
            style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}
          >
            Assign "{itemName}"
          </ThemedText>
          <ThemedText style={{ fontSize: 13, color: "#7A7F87", marginTop: 2 }}>
            {formatCurrency(price, currency)}
          </ThemedText>
        </View>

        <View>
          <ThemedText
            style={{ fontSize: 13, fontWeight: "600", color: colors.backgroundElement, marginBottom: 8 }}
          >
            Assign to
          </ThemedText>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                { borderColor: colors.backgroundElement },
                isSplitAll && { backgroundColor: colors.backgroundElement },
              ]}
              onPress={toggleSplitAll}
            >
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
              const selected = assignedTo.has(m.user_id);
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
        </View>

        {assignedTo.size > 0 && (
          <ThemedText style={{ color: "#888", fontSize: 12 }}>
            {formatCurrency(price / assignedTo.size, currency)} each (
            {assignedTo.size} {assignedTo.size === 1 ? "person" : "people"})
          </ThemedText>
        )}

        <View style={modalStyles.row}>
          <TouchableOpacity
            style={[modalStyles.btn, { backgroundColor: "#e0e0e0" }]}
            onPress={onClose}
          >
            <ThemedText style={{ color: "#333", fontWeight: "600", fontSize: 14 }}>
              Cancel
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.btn, { backgroundColor: colors.backgroundElement }]}
            onPress={onClose}
          >
            <ThemedText style={modalStyles.btnText}>Done</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
    zIndex: 1000,
    elevation: 1000,
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
