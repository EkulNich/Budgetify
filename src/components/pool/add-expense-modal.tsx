import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { modalStyles } from "@/components/ui/modal-styles";
import { SelectModal } from "@/components/ui/select-modal";
import type { CategoryKey } from "@/constants/categories";
import type { ThemeColors } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import {
  CURRENCY_OPTIONS,
  makeEmptyPoolExpenseForm,
  PoolExpenseForm,
} from "./pool-expense-form";

type AddExpenseModalProps = {
  visible: boolean;
  members: PoolMember[];
  colors: ThemeColors;
  /** The pool's currency — everything gets converted into this before saving. */
  defaultCurrency: string;
  convert: (amount: number, from: string, to: string) => number;
  onClose: () => void;
  onSubmit: (input: {
    description: string;
    amount: number;
    currency: string;
    category: CategoryKey;
    targets: string[];
  }) => Promise<void>;
};

export function AddExpenseModal({
  visible,
  members,
  colors,
  defaultCurrency,
  convert,
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const [form, setForm] = useState(() =>
    makeEmptyPoolExpenseForm(defaultCurrency),
  );
  const [adding, setAdding] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  const handleAdd = async () => {
    if (!form.amount.trim() || !form.description.trim() || !form.category) {
      return;
    }
    setAdding(true);

    const isSplitAll = form.selectedMembers.has("split");
    const targets = isSplitAll
      ? members.map((m) => m.user_id)
      : [...form.selectedMembers];

    try {
      await onSubmit({
        description: form.description.trim(),
        amount: convert(parseFloat(form.amount), form.currency, defaultCurrency),
        currency: defaultCurrency,
        category: form.category,
        targets,
      });
      setForm(makeEmptyPoolExpenseForm(defaultCurrency));
      onClose();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setAdding(false);
    }
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
            onOpenCurrencyPicker={() => setCurrencyPickerVisible(true)}
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

        <SelectModal
          visible={currencyPickerVisible}
          title="Currency"
          options={CURRENCY_OPTIONS}
          selectedValue={form.currency}
          colors={colors}
          onSelect={(next) => setForm((prev) => ({ ...prev, currency: next }))}
          onClose={() => setCurrencyPickerVisible(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
