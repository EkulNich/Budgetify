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
import { CategoryEditorSheet } from "@/components/category/category-editor-sheet";
import { modalStyles } from "@/components/ui/modal-styles";
import { SelectModal } from "@/components/ui/select-modal";
import type { ThemeColors } from "@/constants/theme";
import type { Category, CategoryOption, CategoryScope } from "@/hooks/data/use-categories";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import { formatCurrency } from "@/lib/format";
import {
  calculateSplitAmounts,
  validateExactSplit,
  validatePercentageSplit,
} from "@/lib/split";
import {
  CURRENCY_OPTIONS,
  makeEmptyPoolExpenseForm,
  PoolExpenseForm,
  resolveSplitTargets,
} from "./pool-expense-form";

type AddExpenseModalProps = {
  visible: boolean;
  members: PoolMember[];
  colors: ThemeColors;
  /** The pool's currency — everything gets converted into this before saving. */
  defaultCurrency: string;
  convert: (amount: number, from: string, to: string) => number;
  /** This pool's scope, for creating a new category directly from this form. */
  categoryScope: CategoryScope;
  customCategories: CategoryOption[];
  /** Every category (active + archived) in this pool's scope — passed through to the creation sheet. */
  poolCategories: Category[];
  createCategory: (scope: CategoryScope, label: string, icon: string, color: string) => Promise<string>;
  renameCategory: (id: number, label: string, icon?: string, color?: string) => Promise<void>;
  restoreCategory: (id: number, updates?: { icon?: string; color?: string }) => Promise<void>;
  onClose: () => void;
  onSubmit: (input: {
    description: string;
    amount: number;
    currency: string;
    category: string;
    targets: string[];
    splitAmounts: Record<string, number>;
  }) => Promise<void>;
};

export function AddExpenseModal({
  visible,
  members,
  colors,
  defaultCurrency,
  convert,
  categoryScope,
  customCategories,
  poolCategories,
  createCategory,
  renameCategory,
  restoreCategory,
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const [form, setForm] = useState(() =>
    makeEmptyPoolExpenseForm(defaultCurrency),
  );
  const [adding, setAdding] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [categoryEditorVisible, setCategoryEditorVisible] = useState(false);

  const handleAdd = async () => {
    if (!form.amount.trim() || !form.description.trim() || !form.category) {
      return;
    }

    const targets = resolveSplitTargets(form.selectedMembers, members);
    const totalAmount = parseFloat(form.amount);

    if (form.splitMode === "exact") {
      const validation = validateExactSplit(totalAmount, targets, form.customAmounts);
      if (!validation.valid) {
        Alert.alert(
          "Amounts don't add up",
          `The amounts you entered are ${validation.remaining > 0 ? "short by" : "over by"} ${formatCurrency(Math.abs(validation.remaining), form.currency)}. Make them add up to the total before saving.`,
        );
        return;
      }
    } else if (form.splitMode === "percentage") {
      const validation = validatePercentageSplit(targets, form.customPercentages);
      if (!validation.valid) {
        Alert.alert(
          "Percentages don't add up to 100%",
          `Your percentages are ${validation.remaining > 0 ? "short by" : "over by"} ${Math.abs(validation.remaining).toFixed(0)}%. Make them add up to 100% before saving.`,
        );
        return;
      }
    }

    setAdding(true);
    try {
      const rawSplitAmounts = calculateSplitAmounts(
        totalAmount,
        targets,
        form.splitMode,
        form.customAmounts,
        form.customPercentages,
      );
      const splitAmounts = Object.fromEntries(
        Object.entries(rawSplitAmounts).map(([id, shareAmount]) => [
          id,
          convert(shareAmount, form.currency, defaultCurrency),
        ]),
      );

      await onSubmit({
        description: form.description.trim(),
        amount: convert(totalAmount, form.currency, defaultCurrency),
        currency: defaultCurrency,
        category: form.category,
        targets,
        splitAmounts,
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
            customCategories={customCategories}
            onAddCategory={() => setCategoryEditorVisible(true)}
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
          sortSelectedFirst
        />

        <CategoryEditorSheet
          visible={categoryEditorVisible}
          colors={colors}
          scope={categoryScope}
          categories={poolCategories}
          createCategory={createCategory}
          renameCategory={renameCategory}
          restoreCategory={restoreCategory}
          onClose={() => setCategoryEditorVisible(false)}
          onSaved={(key) => setForm((prev) => ({ ...prev, category: key }))}
          avoidKeyboard={false}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}
