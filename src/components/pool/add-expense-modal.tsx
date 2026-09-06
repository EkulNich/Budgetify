import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import { formatCurrency } from "@/lib/format";
import { modalStyles } from "./modal-styles";

type AddExpenseModalProps = {
  visible: boolean;
  members: PoolMember[];
  colors: ThemeColors;
  onClose: () => void;
  onSubmit: (input: {
    description: string;
    amount: number;
    targets: string[];
  }) => Promise<void>;
};

export function AddExpenseModal({
  visible,
  members,
  colors,
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(["split"]),
  );
  const [adding, setAdding] = useState(false);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      next.delete("split");
      if (next.has(userId)) {
        next.delete(userId);
        if (next.size === 0) next.add("split");
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSplitAll = () => setSelectedMembers(new Set(["split"]));

  const handleAdd = async () => {
    if (!expenseAmount.trim() || !expenseDesc.trim()) return;
    setAdding(true);

    const amount = parseFloat(expenseAmount);
    const isSplitAll = selectedMembers.has("split");
    const targets = isSplitAll
      ? members.map((m) => m.user_id)
      : [...selectedMembers];

    await onSubmit({ description: expenseDesc.trim(), amount, targets });

    setExpenseAmount("");
    setExpenseDesc("");
    setSelectedMembers(new Set(["split"]));
    setAdding(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={modalStyles.modalOverlay}
      >
        <View style={[modalStyles.modalCard, { backgroundColor: "#fff" }]}>
          <ThemedText
            style={[modalStyles.modalTitle, { color: colors.backgroundElement }]}
          >
            Add Expense
          </ThemedText>
          <TextInput
            style={[
              modalStyles.input,
              { borderColor: colors.backgroundElement, color: colors.backgroundElement },
            ]}
            placeholder="Description"
            placeholderTextColor="#888"
            value={expenseDesc}
            onChangeText={setExpenseDesc}
          />
          <TextInput
            style={[
              modalStyles.input,
              { borderColor: colors.backgroundElement, color: colors.backgroundElement },
            ]}
            placeholder="Amount ($)"
            placeholderTextColor="#888"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            keyboardType="numeric"
          />
          <ThemedText
            style={{ color: colors.backgroundElement, fontWeight: "600", fontSize: 13 }}
          >
            Assign to:
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
          >
            <View style={styles.assignRow}>
              <TouchableOpacity
                style={[
                  styles.assignBtn,
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
                      styles.assignBtn,
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
              $
              {formatCurrency(parseFloat(expenseAmount || "0") / selectedMembers.size)}{" "}
              each ({selectedMembers.size}{" "}
              {selectedMembers.size === 1 ? "person" : "people"})
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
              onPress={handleAdd}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={modalStyles.btnText}>Add</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  assignRow: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  assignBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
