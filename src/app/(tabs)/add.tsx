import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  CURRENCY_OPTIONS,
  makeEmptyPoolExpenseForm,
  PoolExpenseForm,
  resolveSplitTargets,
} from "@/components/pool/pool-expense-form";
import { CategoryEditorSheet } from "@/components/category/category-editor-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SelectModal } from "@/components/ui/select-modal";
import {
  ReceiptReviewModal,
  type SavedGroupEntry,
  type SavedIndividualEntry,
} from "@/components/receipt/receipt-review-modal";
import { Spacing } from "@/constants/theme";
import { useCategories, type CategoryScope } from "@/hooks/data/use-categories";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useExchangeRates } from "@/hooks/data/use-exchange-rates";
import { insertExpense } from "@/hooks/data/use-expenses";
import { useFriends } from "@/hooks/data/use-friends";
import {
  INDIVIDUAL_TARGET,
  useLastExpenseTarget,
} from "@/hooks/data/use-last-expense-target";
import { addExpenseToPool, usePoolExpenses } from "@/hooks/data/use-pool-expenses";
import { usePoolMembers, type PoolMember } from "@/hooks/data/use-pool-members";
import { createQuickSplitPool, usePools } from "@/hooks/data/use-pools";
import { useProfile } from "@/hooks/data/use-profile";
import { useReceiptScan } from "@/hooks/data/use-receipt-scan";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";
import { dateToIsoTimestamp, type ScannedReceipt } from "@/lib/receipt";
import {
  calculateSplitAmounts,
  validateExactSplit,
  validatePercentageSplit,
} from "@/lib/split";

const QUICK_SPLIT_TARGET = "quick_split";

function quickSplitName(usernames: string[]): string {
  if (usernames.length === 0) return "Quick Split";
  if (usernames.length <= 2) return `Split with ${usernames.join(", ")}`;
  return `Split with ${usernames.slice(0, 2).join(", ")} +${usernames.length - 2}`;
}

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

  const isQuickSplit = target === QUICK_SPLIT_TARGET;

  // If the previously-selected pool no longer exists (deleted, or the user left it),
  // fall back to Individual once we actually know the current pool list.
  useEffect(() => {
    if (!targetLoaded || poolsLoading) return;
    if (
      target !== INDIVIDUAL_TARGET &&
      target !== QUICK_SPLIT_TARGET &&
      !pools.some((p) => String(p.id) === target)
    ) {
      setTarget(INDIVIDUAL_TARGET);
    }
  }, [targetLoaded, poolsLoading, pools, target, setTarget]);

  const selectedPool =
    target !== INDIVIDUAL_TARGET && !isQuickSplit
      ? pools.find((p) => String(p.id) === target)
      : undefined;
  const poolId = selectedPool?.id ?? null;
  const isGroup = target !== INDIVIDUAL_TARGET;
  const defaultCurrency =
    (isQuickSplit ? profile?.currency : isGroup ? selectedPool?.currency : profile?.currency) ??
    "SGD";

  const { friends } = useFriends(user?.id);
  const [quickSplitParticipants, setQuickSplitParticipants] = useState<Set<string>>(
    new Set(),
  );
  const [friendSearch, setFriendSearch] = useState("");
  const filteredFriends = useMemo(() => {
    const query = friendSearch.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter((f) => f.username.toLowerCase().includes(query));
  }, [friends, friendSearch]);
  const friendsAsMembers: PoolMember[] = useMemo(
    () =>
      friends
        .filter((f) => quickSplitParticipants.has(f.id))
        .map((f) => ({
          user_id: f.id,
          username: f.username,
          contribution_limit: 0,
          amount_spent: 0,
        })),
    [friends, quickSplitParticipants],
  );

  const { members: realPoolMembers } = usePoolMembers(poolId);
  const members = isQuickSplit ? friendsAsMembers : realPoolMembers;
  const { addExpense: addPoolExpense } = usePoolExpenses(poolId);

  const {
    forPersonal,
    forPool,
    poolCategoriesFor,
    personalCategories,
    createCategory,
    renameCategory,
    restoreCategory,
  } = useCategories(user?.id);
  // Quick split's hidden pool is created fresh per submission (see
  // createQuickSplitPool below) — there's no stable pool identity yet to
  // scope a custom category to, so it only ever offers the 5 system ones.
  const categoryScope: CategoryScope | null = isQuickSplit
    ? null
    : isGroup && poolId
      ? { type: "pool", poolId }
      : { type: "personal" };
  const customCategories = isQuickSplit
    ? []
    : isGroup && poolId
      ? forPool(poolId)
      : forPersonal();
  const categoriesForSheet = isGroup && poolId ? poolCategoriesFor(poolId) : personalCategories;
  const [categoryEditorVisible, setCategoryEditorVisible] = useState(false);

  const [form, setForm] = useState(() =>
    makeEmptyPoolExpenseForm(defaultCurrency),
  );
  const [submitting, setSubmitting] = useState(false);
  const [reviewReceipt, setReviewReceipt] = useState<ScannedReceipt | null>(null);
  const { scanning, presentScanOptions } = useReceiptScan();

  // Clear whatever was in progress whenever the target (or its default currency)
  // changes, so a half-filled entry can't accidentally get submitted against the
  // wrong destination.
  useEffect(() => {
    setForm(makeEmptyPoolExpenseForm(defaultCurrency));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, defaultCurrency]);

  const handleScanReceipt = async () => {
    const result = await presentScanOptions();
    if (!result) return;

    if (result.items.length === 0) {
      Alert.alert(
        "No items found",
        "Couldn't make out individual items on that receipt — please enter the expense manually.",
      );
      return;
    }

    setReviewReceipt(result);
  };

  const handleSaveReviewIndividual = async (
    entries: SavedIndividualEntry[],
    leftoverAmount: number,
    currency: string,
    date: string,
  ) => {
    if (!user) return;
    const createdAt = dateToIsoTimestamp(date);

    for (const entry of entries) {
      await insertExpense(user.id, {
        amount: entry.amount,
        currency,
        category: entry.category,
        description: entry.name,
        createdAt,
      });
    }
    if (leftoverAmount > 0.01) {
      await insertExpense(user.id, {
        amount: leftoverAmount,
        currency,
        category: "others",
        description: "Tax & Fees",
        createdAt,
      });
    }
    Alert.alert("Saved!", `${entries.length} expense(s) added.`);
  };

  const handleSaveReviewGroup = async (
    entries: SavedGroupEntry[],
    leftover: { amount: number; targets: string[] } | null,
    currency: string,
    date: string,
  ) => {
    if (!user || !poolId) return;
    const createdAt = dateToIsoTimestamp(date);

    for (const entry of entries) {
      await addPoolExpense({
        userId: user.id,
        description: entry.name,
        amount: entry.amount,
        currency,
        category: entry.category,
        targets: entry.targets,
        createdAt,
      });
    }
    if (leftover) {
      await addPoolExpense({
        userId: user.id,
        description: "Tax & Fees",
        amount: leftover.amount,
        currency,
        category: "others",
        targets: leftover.targets,
        createdAt,
      });
    }
    Alert.alert("Saved!", `${entries.length + (leftover ? 1 : 0)} expense(s) added.`);
  };

  const handleSaveReviewQuickSplit = async (
    entries: SavedGroupEntry[],
    leftover: { amount: number; targets: string[] } | null,
    currency: string,
    date: string,
  ) => {
    if (!user || quickSplitParticipants.size === 0) return;
    const createdAt = dateToIsoTimestamp(date);

    const total = entries.reduce((sum, e) => sum + e.amount, 0) + (leftover?.amount ?? 0);
    const newPoolId = await createQuickSplitPool(
      user.id,
      members.map((m) => m.user_id),
      quickSplitName(members.map((m) => m.username)),
      currency,
      total,
    );

    for (const entry of entries) {
      await addExpenseToPool(newPoolId, {
        userId: user.id,
        description: entry.name,
        amount: entry.amount,
        currency,
        category: entry.category,
        targets: [user.id, ...entry.targets],
        createdAt,
      });
    }
    if (leftover) {
      await addExpenseToPool(newPoolId, {
        userId: user.id,
        description: "Tax & Fees",
        amount: leftover.amount,
        currency,
        category: "others",
        targets: [user.id, ...leftover.targets],
        createdAt,
      });
    }
    Alert.alert("Saved!", `${entries.length + (leftover ? 1 : 0)} expense(s) added.`);
    setQuickSplitParticipants(new Set());
  };

  const options = [
    { value: INDIVIDUAL_TARGET, label: "Individual" },
    { value: QUICK_SPLIT_TARGET, label: "Quick Split" },
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
        description: form.description.trim() || null,
      });
      Alert.alert("Saved!", "Expense added.");
      setForm(makeEmptyPoolExpenseForm(defaultCurrency));
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

    setSubmitting(true);
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

      await addPoolExpense({
        userId: user.id,
        description: form.description.trim(),
        amount: convert(totalAmount, form.currency, defaultCurrency),
        currency: defaultCurrency,
        category: form.category,
        targets,
        splitAmounts,
      });
      Alert.alert("Saved!", "Expense added.");
      setForm(makeEmptyPoolExpenseForm(defaultCurrency));
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddQuickSplit = async () => {
    if (!user || !profile) return;
    if (!form.amount.trim() || !form.description.trim() || !form.category) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (quickSplitParticipants.size === 0) {
      Alert.alert("Missing info", "Pick at least one friend to split with.");
      return;
    }

    const chosenFriendIds = resolveSplitTargets(form.selectedMembers, members);
    const targets = [user.id, ...chosenFriendIds];
    const totalAmount = parseFloat(form.amount);
    const quickSplitCurrency = profile.currency ?? "SGD";

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

    setSubmitting(true);
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
          convert(shareAmount, form.currency, quickSplitCurrency),
        ]),
      );
      const convertedTotal = convert(totalAmount, form.currency, quickSplitCurrency);

      const participantNames = members
        .filter((m) => chosenFriendIds.includes(m.user_id))
        .map((m) => m.username);

      const newPoolId = await createQuickSplitPool(
        user.id,
        chosenFriendIds,
        quickSplitName(participantNames),
        quickSplitCurrency,
        convertedTotal,
      );

      await addExpenseToPool(newPoolId, {
        userId: user.id,
        description: form.description.trim(),
        amount: convertedTotal,
        currency: quickSplitCurrency,
        category: form.category,
        targets,
        splitAmounts,
      });

      Alert.alert("Saved!", "Expense added.");
      setForm(makeEmptyPoolExpenseForm(quickSplitCurrency));
      setQuickSplitParticipants(new Set());
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
            <View style={styles.addForSection}>
              <ThemedText style={[styles.label, { color: colors.backgroundElement }]}>
                Add for
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.dropdown,
                  { borderColor: colors.backgroundElement, backgroundColor: colors.backgroundElement + "0D" },
                ]}
                onPress={() => setPickerVisible(true)}
              >
                <View style={styles.dropdownLeft}>
                  <Ionicons name="people-outline" size={16} color={colors.backgroundElement} />
                  <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                    {currentLabel}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: colors.backgroundElement, fontSize: 11 }}>▾</ThemedText>
              </TouchableOpacity>
            </View>

            {isQuickSplit && (
              <View style={styles.addForSection}>
                <ThemedText style={[styles.label, { color: colors.backgroundElement }]}>
                  Split with
                </ThemedText>
                {friends.length === 0 ? (
                  <ThemedText style={{ color: "#9AA0A8", fontSize: 13 }}>
                    Add friends first to quick split with them.
                  </ThemedText>
                ) : (
                  <>
                    <View
                      style={[
                        styles.friendSearchRow,
                        { borderColor: colors.backgroundElement },
                      ]}
                    >
                      <Ionicons name="search" size={15} color="#9AA0A8" />
                      <TextInput
                        style={[styles.friendSearchInput, { color: colors.backgroundElement }]}
                        placeholder="Search friends..."
                        placeholderTextColor="#9AA0A8"
                        value={friendSearch}
                        onChangeText={setFriendSearch}
                      />
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexGrow: 0 }}
                    >
                      <View style={styles.chipRow}>
                        {filteredFriends.map((f) => {
                          const selected = quickSplitParticipants.has(f.id);
                          return (
                            <TouchableOpacity
                              key={f.id}
                              style={[
                                styles.chip,
                                { borderColor: colors.backgroundElement },
                                selected && { backgroundColor: colors.backgroundElement },
                              ]}
                              onPress={() =>
                                setQuickSplitParticipants((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(f.id)) next.delete(f.id);
                                  else next.add(f.id);
                                  return next;
                                })
                              }
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
                                {f.username}
                              </ThemedText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </>
                )}
              </View>
            )}

            {(!isQuickSplit || quickSplitParticipants.size > 0) && (
              <View style={styles.formSection}>
                <PoolExpenseForm
                  members={members}
                  colors={colors}
                  value={form}
                  onChange={setForm}
                  showAssignTo={isGroup}
                  onOpenCurrencyPicker={() => setCurrencyPickerVisible(true)}
                  customCategories={customCategories}
                  onAddCategory={
                    categoryScope ? () => setCategoryEditorVisible(true) : undefined
                  }
                />
                <PrimaryButton
                  label={submitting ? "Adding..." : "Add Expense"}
                  loading={submitting}
                  onPress={
                    isQuickSplit
                      ? handleAddQuickSplit
                      : isGroup
                        ? handleAddGroup
                        : handleAddIndividual
                  }
                />

                <TouchableOpacity
                  style={[styles.scanButton, { borderColor: colors.backgroundElement }]}
                  onPress={handleScanReceipt}
                  disabled={scanning}
                >
                  {scanning ? (
                    <ActivityIndicator color={colors.backgroundElement} />
                  ) : (
                    <>
                      <View style={styles.scanButtonTitleRow}>
                        <Ionicons name="camera-outline" size={16} color={colors.backgroundElement} />
                        <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                          Scan Receipt
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.scanButtonSubtext}>
                        Auto-fill details from a receipt
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
        useNativeModal
      />

      <SelectModal
        visible={currencyPickerVisible}
        title="Currency"
        options={CURRENCY_OPTIONS}
        selectedValue={form.currency}
        colors={colors}
        onSelect={(next) => setForm((prev) => ({ ...prev, currency: next }))}
        onClose={() => setCurrencyPickerVisible(false)}
        sortSelectedFirst
        useNativeModal
      />

      {reviewReceipt && (
        <ReceiptReviewModal
          visible
          colors={colors}
          scannedItems={reviewReceipt.items}
          receiptTotal={reviewReceipt.amount}
          merchant={reviewReceipt.description}
          date={reviewReceipt.date}
          isGroup={isGroup}
          members={members}
          customCategories={customCategories}
          defaultCurrency={defaultCurrency}
          convert={convert}
          onClose={() => setReviewReceipt(null)}
          onSaveIndividual={handleSaveReviewIndividual}
          onSaveGroup={isQuickSplit ? handleSaveReviewQuickSplit : handleSaveReviewGroup}
        />
      )}

      {categoryScope && (
        <CategoryEditorSheet
          visible={categoryEditorVisible}
          colors={colors}
          scope={categoryScope}
          categories={categoriesForSheet}
          createCategory={createCategory}
          renameCategory={renameCategory}
          restoreCategory={restoreCategory}
          onClose={() => setCategoryEditorVisible(false)}
          onSaved={(key) => setForm((prev) => ({ ...prev, category: key }))}
          useNativeModal
        />
      )}
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
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  label: {
    fontWeight: "700",
    fontSize: 15,
  },
  addForSection: {
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
  formSection: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  friendSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.one,
  },
  friendSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
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
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  scanButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
    alignItems: "center",
    gap: 2,
  },
  scanButtonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  scanButtonSubtext: {
    fontSize: 11.5,
    color: "#9AA0A8",
  },
});
