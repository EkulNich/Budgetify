import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SelectModal } from "@/components/ui/select-modal";
import { CURRENCY_OPTIONS } from "@/components/pool/pool-expense-form";
import type { CategoryKey } from "@/constants/categories";
import type { ThemeColors } from "@/constants/theme";
import { Spacing } from "@/constants/theme";
import type { PoolMember } from "@/hooks/data/use-pool-members";
import { formatCurrency } from "@/lib/format";
import type { ReceiptItem } from "@/lib/receipt";
import { ItemAssignSheet } from "./item-assign-sheet";
import { ReceiptItemRow } from "./receipt-item-row";
import { makeReviewItems, type ReviewItem } from "./review-item";

export type SavedGroupEntry = {
  category: CategoryKey;
  name: string;
  amount: number;
  targets: string[];
};
export type SavedIndividualEntry = { category: CategoryKey; name: string; amount: number };

type ReceiptReviewModalProps = {
  visible: boolean;
  colors: ThemeColors;
  scannedItems: ReceiptItem[];
  receiptTotal: number | null;
  merchant: string | null;
  date: string | null;
  isGroup: boolean;
  members: PoolMember[];
  defaultCurrency: string;
  convert: (amount: number, from: string, to: string) => number;
  onClose: () => void;
  onSaveIndividual: (
    entries: SavedIndividualEntry[],
    leftoverAmount: number,
    currency: string,
  ) => Promise<void>;
  onSaveGroup: (
    entries: SavedGroupEntry[],
    leftover: { amount: number; targets: string[] } | null,
    currency: string,
  ) => Promise<void>;
};

function parsePrice(price: string): number {
  const n = parseFloat(price);
  return Number.isNaN(n) ? 0 : n;
}

export function ReceiptReviewModal({
  visible,
  colors,
  scannedItems,
  receiptTotal,
  merchant,
  date,
  isGroup,
  members,
  defaultCurrency,
  convert,
  onClose,
  onSaveIndividual,
  onSaveGroup,
}: ReceiptReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ReviewItem[]>(() => makeReviewItems(scannedItems));
  const [currency, setCurrency] = useState(defaultCurrency);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, i) => sum + parsePrice(i.price), 0),
    [items],
  );
  const taxFees = receiptTotal !== null ? Math.max(0, receiptTotal - itemsSubtotal) : 0;
  const grandTotal = itemsSubtotal + taxFees;

  const assignedSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + (i.assignedTo.size > 0 ? parsePrice(i.price) : 0),
        0,
      ),
    [items],
  );
  const unassignedCount = items.filter((i) => i.assignedTo.size === 0).length;

  const memberTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of items) {
      if (item.assignedTo.size === 0) continue;
      const share = parsePrice(item.price) / item.assignedTo.size;
      for (const uid of item.assignedTo) {
        totals.set(uid, (totals.get(uid) ?? 0) + share);
      }
    }
    if (taxFees > 0.01 && totals.size > 0) {
      const share = taxFees / totals.size;
      for (const uid of totals.keys()) {
        totals.set(uid, (totals.get(uid) ?? 0) + share);
      }
    }
    return totals;
  }, [items, taxFees]);

  const assigningItem = items.find((i) => i.id === assigningItemId) ?? null;

  const updateItem = (updated: ReviewItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    if (items.some((i) => i.category === null)) {
      Alert.alert("Missing category", "Please pick a category for every item.");
      return;
    }

    setSaving(true);
    try {
      if (isGroup) {
        const assignedItems = items.filter((i) => i.assignedTo.size > 0);
        const skipped = items.length - assignedItems.length;

        const entries: SavedGroupEntry[] = assignedItems.map((i) => ({
          category: i.category!,
          name: i.name,
          amount: convert(parsePrice(i.price), currency, defaultCurrency),
          targets: [...i.assignedTo],
        }));

        let leftover: { amount: number; targets: string[] } | null = null;
        if (taxFees > 0.01) {
          const targets = [
            ...new Set(assignedItems.flatMap((i) => [...i.assignedTo])),
          ];
          if (targets.length > 0) {
            leftover = { amount: convert(taxFees, currency, defaultCurrency), targets };
          }
        }

        await onSaveGroup(entries, leftover, defaultCurrency);
        onClose();

        if (skipped > 0) {
          Alert.alert(
            "Some items skipped",
            `${skipped} unassigned item${skipped === 1 ? "" : "s"} ${skipped === 1 ? "was" : "were"} not saved.`,
          );
        }
      } else {
        const entries: SavedIndividualEntry[] = items.map((i) => ({
          category: i.category!,
          name: i.name,
          amount: convert(parsePrice(i.price), currency, defaultCurrency),
        }));
        const leftoverAmount =
          taxFees > 0.01 ? convert(taxFees, currency, defaultCurrency) : 0;

        await onSaveIndividual(entries, leftoverAmount, defaultCurrency);
        onClose();
      }
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
              <TouchableOpacity onPress={onClose}>
                <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <ThemedText type="title" style={{ color: colors.backgroundElement, fontSize: 18 }}>
                Review Receipt
              </ThemedText>
              <View style={{ width: 50 }} />
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={{ fontSize: 13, color: "#7A7F87" }}>
                {merchant ?? "Receipt"}
                {date ? ` · ${date}` : ""}
              </ThemedText>
              <TouchableOpacity
                style={[styles.currencyButton, { borderColor: colors.backgroundElement }]}
                onPress={() => setCurrencyPickerVisible(true)}
              >
                <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600", fontSize: 12 }}>
                  {currency}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {isGroup && (
              <View
                style={[
                  styles.banner,
                  unassignedCount > 0
                    ? { backgroundColor: "#C0392B14", borderColor: "#C0392B40" }
                    : { backgroundColor: "#2D612A14", borderColor: "#2D612A40" },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: unassignedCount > 0 ? "#C0392B" : "#2D612A",
                  }}
                >
                  {formatCurrency(assignedSubtotal, currency)} of{" "}
                  {formatCurrency(itemsSubtotal, currency)} assigned
                  {unassignedCount > 0
                    ? ` — ${unassignedCount} item${unassignedCount === 1 ? "" : "s"} still ${unassignedCount === 1 ? "needs" : "need"} a person`
                    : ""}
                </ThemedText>
              </View>
            )}

            {isGroup && memberTotals.size > 0 && (
              <View style={styles.breakdownCard}>
                <ThemedText style={styles.breakdownLabel}>Split so far</ThemedText>
                <View style={styles.breakdownRow}>
                  {members
                    .filter((m) => memberTotals.has(m.user_id))
                    .map((m) => (
                      <View key={m.user_id} style={styles.breakdownChip}>
                        <ThemedText style={{ fontSize: 13, color: colors.backgroundElement, fontWeight: "600" }}>
                          {m.username}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 13, color: colors.backgroundElement }}>
                          {formatCurrency(memberTotals.get(m.user_id) ?? 0, currency)}
                        </ThemedText>
                      </View>
                    ))}
                </View>
              </View>
            )}

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {items.length === 0 ? (
                  <ThemedText style={{ color: "#888", textAlign: "center", marginTop: Spacing.four }}>
                    No items could be read from that receipt.
                  </ThemedText>
                ) : (
                  items.map((item) => (
                    <ReceiptItemRow
                      key={item.id}
                      item={item}
                      colors={colors}
                      onChange={updateItem}
                      members={isGroup ? members : undefined}
                      onOpenAssign={() => setAssigningItemId(item.id)}
                    />
                  ))
                )}
              </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
              <View style={styles.totalsRow}>
                <ThemedText style={{ fontSize: 13, color: "#7A7F87" }}>Items</ThemedText>
                <ThemedText style={{ fontSize: 13, color: "#333" }}>
                  {formatCurrency(itemsSubtotal, currency)}
                </ThemedText>
              </View>
              {taxFees > 0.01 && (
                <View style={styles.totalsRow}>
                  <ThemedText style={{ fontSize: 13, color: "#7A7F87" }}>Tax & Fees</ThemedText>
                  <ThemedText style={{ fontSize: 13, color: "#333" }}>
                    {formatCurrency(taxFees, currency)}
                  </ThemedText>
                </View>
              )}
              <View style={[styles.totalsRow, styles.grandTotalRow]}>
                <ThemedText style={{ fontSize: 15, fontWeight: "700", color: "#23262B" }}>
                  Total
                </ThemedText>
                <ThemedText style={{ fontSize: 15, fontWeight: "700", color: "#23262B" }}>
                  {formatCurrency(grandTotal, currency)}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.backgroundElement }]}
                onPress={handleSave}
                disabled={saving || items.length === 0}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    Save All
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <SelectModal
            visible={currencyPickerVisible}
            title="Currency"
            options={CURRENCY_OPTIONS}
            selectedValue={currency}
            colors={colors}
            onSelect={setCurrency}
            onClose={() => setCurrencyPickerVisible(false)}
          />

          {assigningItem && (
            <ItemAssignSheet
              visible={assigningItemId !== null}
              itemName={assigningItem.name}
              price={parsePrice(assigningItem.price)}
              currency={currency}
              members={members}
              assignedTo={assigningItem.assignedTo}
              colors={colors}
              onChange={(assignedTo) => updateItem({ ...assigningItem, assignedTo })}
              onClose={() => setAssigningItemId(null)}
            />
          )}
        </ThemedView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  currencyButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  banner: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
  },
  breakdownCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Spacing.three,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7A7F87",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  breakdownRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  breakdownChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2D612A0D",
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: 0,
    gap: Spacing.two,
  },
  footer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    padding: Spacing.four,
    gap: 6,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    paddingTop: 6,
    marginBottom: Spacing.two,
  },
  saveButton: {
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: "center",
  },
});
