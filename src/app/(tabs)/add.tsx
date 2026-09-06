import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CURRENCY_OPTIONS,
  makeEmptyPoolExpenseForm,
  PoolExpenseForm,
} from "@/components/pool/pool-expense-form";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectModal } from "@/components/ui/select-modal";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { insertExpense } from "@/hooks/data/use-expenses";
import {
  INDIVIDUAL_TARGET,
  useLastExpenseTarget,
} from "@/hooks/data/use-last-expense-target";
import { usePoolExpenses } from "@/hooks/data/use-pool-expenses";
import { usePoolMembers } from "@/hooks/data/use-pool-members";
import { usePools } from "@/hooks/data/use-pools";
import { useProfile } from "@/hooks/data/use-profile";
import { useReceiptScan } from "@/hooks/data/use-receipt-scan";
import { useTheme } from "@/hooks/use-theme";
import { dateToIsoTimestamp } from "@/lib/receipt";
import { formatExpenseDate } from "@/lib/format";

export default function AddScreen() {
  const { user } = useCurrentUser();
  const colors = useTheme();
  const { profile } = useProfile(user?.id);
  const { convert } = useExchangeRates();
  const { pools, loading: poolsLoading } = usePools(user?.id);
  const { target, setTarget, loaded: targetLoaded } = useLastExpenseTarget(
    user?.id,
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  // If the previously-selected pool no longer exists (deleted, or the user left it),
  // fall back to Individual once we actually know the current pool list.
  useEffect(() => {
    if (!targetLoaded || poolsLoading) return;
    if (
      target !== INDIVIDUAL_TARGET &&
      !pools.some((p) => String(p.id) === target)
    ) {
      setTarget(INDIVIDUAL_TARGET);
    }
  }, [targetLoaded, poolsLoading, pools, target, setTarget]);

  const selectedPool =
    target !== INDIVIDUAL_TARGET
      ? pools.find((p) => String(p.id) === target)
      : undefined;
  const poolId = selectedPool?.id ?? null;
  const isGroup = target !== INDIVIDUAL_TARGET;
  const defaultCurrency =
    (isGroup ? selectedPool?.currency : profile?.currency) ?? "SGD";

  const { members } = usePoolMembers(poolId);
  const { addExpense: addPoolExpense } = usePoolExpenses(poolId);

  const [form, setForm] = useState(() =>
    makeEmptyPoolExpenseForm(defaultCurrency),
  );
  const [submitting, setSubmitting] = useState(false);
  const [scannedDate, setScannedDate] = useState<string | null>(null);
  const { scanning, presentScanOptions } = useReceiptScan();

  // Clear whatever was in progress whenever the target (or its default currency)
  // changes, so a half-filled entry can't accidentally get submitted against the
  // wrong destination.
  useEffect(() => {
    setForm(makeEmptyPoolExpenseForm(defaultCurrency));
    setScannedDate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, defaultCurrency]);

  const handleScanReceipt = async () => {
    const result = await presentScanOptions();
    if (!result) return;

    if (result.amount === null && !result.description && !result.date) {
      Alert.alert("Couldn't read receipt", "Please enter the details manually.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      amount: result.amount !== null ? String(result.amount) : prev.amount,
      description: result.description ?? prev.description,
    }));
    setScannedDate(result.date);

    if (result.amount === null) {
      Alert.alert(
        "Partial scan",
        "Couldn't read the amount from that receipt — please check the details before saving.",
      );
    }
  };

  const options = [
    { value: INDIVIDUAL_TARGET, label: "Individual" },
    ...pools.map((p) => ({ value: String(p.id), label: p.name })),
  ];
  const currentLabel =
    options.find((o) => o.value === target)?.label ?? "Individual";

  const handleAddIndividual = async () => {
    if (!user) return;
    if (!form.amount.trim()) {
      Alert.alert("Missing info", "Please enter an amount.");
      return;
    }
    if (!form.category) {
      Alert.alert("Missing info", "Please pick a category.");
      return;
    }
    if (form.category === "others" && !form.description.trim()) {
      Alert.alert("Missing info", "Please describe the expense.");
      return;
    }

    setSubmitting(true);
    try {
      await insertExpense(user.id, {
        amount: convert(parseFloat(form.amount), form.currency, defaultCurrency),
        currency: defaultCurrency,
        category: form.category,
        description: form.category === "others" ? form.description.trim() : null,
        createdAt: scannedDate ? dateToIsoTimestamp(scannedDate) : undefined,
      });
      Alert.alert("Saved!", "Expense added.");
      setForm(makeEmptyPoolExpenseForm(defaultCurrency));
      setScannedDate(null);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddGroup = async () => {
    if (!user || !poolId) return;
    if (!form.amount.trim() || !form.description.trim() || !form.category) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const isSplitAll = form.selectedMembers.has("split");
      const targets = isSplitAll
        ? members.map((m) => m.user_id)
        : [...form.selectedMembers];

      await addPoolExpense({
        userId: user.id,
        description: form.description.trim(),
        amount: convert(parseFloat(form.amount), form.currency, defaultCurrency),
        currency: defaultCurrency,
        category: form.category,
        targets,
        createdAt: scannedDate ? dateToIsoTimestamp(scannedDate) : undefined,
      });
      Alert.alert("Saved!", "Expense added.");
      setForm(makeEmptyPoolExpenseForm(defaultCurrency));
      setScannedDate(null);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const initializing =
    !targetLoaded || (isGroup && poolsLoading);

  if (initializing) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={colors.backgroundElement} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText
              type="title"
              style={{ color: colors.backgroundElement, marginBottom: Spacing.two }}
            >
              Add Expense
            </ThemedText>

            <View style={styles.addForSection}>
              <ThemedText style={[styles.label, { color: colors.backgroundElement }]}>
                Add for
              </ThemedText>
              <TouchableOpacity
                style={[styles.dropdown, { borderColor: colors.backgroundElement }]}
                onPress={() => setPickerVisible(true)}
              >
                <ThemedText style={{ color: colors.backgroundElement }}>
                  {currentLabel}
                </ThemedText>
                <ThemedText style={{ color: colors.backgroundElement }}>▾</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <PoolExpenseForm
                members={members}
                colors={colors}
                value={form}
                onChange={setForm}
                showAssignTo={isGroup}
                onOpenCurrencyPicker={() => setCurrencyPickerVisible(true)}
              />
              <PrimaryButton
                label={submitting ? "Adding..." : "Add Expense"}
                loading={submitting}
                onPress={isGroup ? handleAddGroup : handleAddIndividual}
              />

              <TouchableOpacity
                style={[styles.scanButton, { borderColor: colors.backgroundElement }]}
                onPress={handleScanReceipt}
                disabled={scanning}
              >
                {scanning ? (
                  <ActivityIndicator color={colors.backgroundElement} />
                ) : (
                  <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                    📷 Scan Receipt
                  </ThemedText>
                )}
              </TouchableOpacity>

              {scannedDate && (
                <ThemedText type="small" style={{ color: "#888", textAlign: "center" }}>
                  Using receipt date: {formatExpenseDate(scannedDate)}
                </ThemedText>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SelectModal
        visible={pickerVisible}
        title="Add expense for"
        options={options}
        selectedValue={target}
        colors={colors}
        onSelect={setTarget}
        onClose={() => setPickerVisible(false)}
      />

      <SelectModal
        visible={currencyPickerVisible}
        title="Currency"
        options={CURRENCY_OPTIONS}
        selectedValue={form.currency}
        colors={colors}
        onSelect={(next) => setForm((prev) => ({ ...prev, currency: next }))}
        onClose={() => setCurrencyPickerVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  scrollContent: {
    paddingBottom: Spacing.four,
  },
  label: {
    fontWeight: "600",
    fontSize: 13,
  },
  addForSection: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  formSection: {
    gap: Spacing.three,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
  },
  scanButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: "center",
  },
});
