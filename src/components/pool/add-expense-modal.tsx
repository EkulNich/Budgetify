import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { modalStyles } from "@/components/ui/modal-styles";
import type { CategoryKey } from "@/constants/categories";
import type { ThemeColors } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import {
  EMPTY_POOL_EXPENSE_FORM,
  PoolExpenseForm,
} from "./pool-expense-form";

type AddExpenseModalProps = {
  visible: boolean;
  members: PoolMember[];
  colors: ThemeColors;
  onClose: () => void;
  onSubmit: (input: {
    description: string;
    amount: number;
    category: CategoryKey;
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
  const [form, setForm] = useState(EMPTY_POOL_EXPENSE_FORM);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!form.amount.trim() || !form.description.trim() || !form.category) {
      return;
    }
    setAdding(true);

    const isSplitAll = form.selectedMembers.has("split");
    const targets = isSplitAll
      ? members.map((m) => m.user_id)
      : [...form.selectedMembers];

    await onSubmit({
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      targets,
    });

    setForm(EMPTY_POOL_EXPENSE_FORM);
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

          <PoolExpenseForm
            members={members}
            colors={colors}
            value={form}
            onChange={setForm}
          />

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
