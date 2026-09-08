import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SelectModal } from "@/components/ui/select-modal";
import { CURRENCIES } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { createPool, usePools, type Pool } from "@/hooks/data/use-pools";
import { useProfile } from "@/hooks/data/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} — ${c.name}`,
}));

const PRIMARY_GREEN = "#2D612A";
const NEGATIVE_RED = "#C0392B";
const TEXT_DARK = "#23262B";
const TEXT_MUTED = "#9AA0A8";
const UNUSED_GREY = "#8A8F98";

type PoolStatus = "overspent" | "on-track" | "unused";

function poolStatus(pool: Pool): PoolStatus {
  if (pool.total_spent <= 0) return "unused";
  if (pool.total_spent > pool.pool_limit) return "overspent";
  return "on-track";
}

const STATUS_META: Record<PoolStatus, { label: string; color: string }> = {
  overspent: { label: "Overspent", color: NEGATIVE_RED },
  "on-track": { label: "On track", color: PRIMARY_GREEN },
  unused: { label: "Unused", color: UNUSED_GREY },
};

export default function PoolsScreen() {
  const colors = useTheme();
  const { user } = useCurrentUser();
  const { profile } = useProfile(user?.id);
  const { pools, loading, refetch } = usePools(user?.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolLimit, setPoolLimit] = useState("");
  const [poolCurrency, setPoolCurrency] = useState("SGD");
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pools;
    return pools.filter((pool) => pool.name.toLowerCase().includes(query));
  }, [pools, searchQuery]);

  useEffect(() => {
    if (profile?.currency) setPoolCurrency(profile.currency);
  }, [profile?.currency]);

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const handleCreatePool = async () => {
    if (!poolName.trim() || !poolLimit.trim() || !user) return;
    setCreating(true);

    try {
      await createPool(
        user.id,
        poolName.trim(),
        parseFloat(poolLimit),
        poolCurrency,
      );
      setPoolName("");
      setPoolLimit("");
      setModalVisible(false);
      refetch();
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to create pool: " + (error as Error).message,
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={PRIMARY_GREEN} />
            <ThemedText style={styles.backText}>Back</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addPoolBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {pools.length > 0 && (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={TEXT_MUTED} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pools..."
              placeholderTextColor={TEXT_MUTED}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.backgroundElement} />
        ) : pools.length === 0 ? (
          <ThemedText style={{ color: colors.textSecondary }}>
            No pools yet — tap + to create one!
          </ThemedText>
        ) : filteredPools.length === 0 ? (
          <ThemedText style={{ color: colors.textSecondary }}>
            No pools match "{searchQuery}".
          </ThemedText>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredPools.map((pool, index) => {
              const rawPercent =
                pool.pool_limit > 0
                  ? (pool.total_spent / pool.pool_limit) * 100
                  : 0;
              const barPercent = Math.min(Math.max(rawPercent, 0), 100);
              const status = poolStatus(pool);
              const meta = STATUS_META[status];
              const avatarColors =
                status === "overspent"
                  ? { bg: NEGATIVE_RED + "1F", fg: NEGATIVE_RED }
                  : index % 2 === 0
                    ? { bg: PRIMARY_GREEN, fg: "#fff" }
                    : { bg: PRIMARY_GREEN + "14", fg: PRIMARY_GREEN };

              return (
                <TouchableOpacity
                  key={pool.id}
                  style={styles.card}
                  onPress={() => router.push(`/social/pool/${pool.id}`)}
                >
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: avatarColors.bg },
                      ]}
                    >
                      <ThemedText
                        style={[styles.avatarText, { color: avatarColors.fg }]}
                      >
                        {pool.name.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.poolName}>
                        {pool.name}
                      </ThemedText>
                      <ThemedText style={styles.poolAmounts}>
                        {formatCurrency(pool.total_spent, pool.currency)} /{" "}
                        {formatCurrency(pool.pool_limit, pool.currency)}
                      </ThemedText>
                    </View>
                    <View style={styles.statusCol}>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: meta.color + "14" },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: meta.color },
                          ]}
                        />
                        <ThemedText
                          style={[styles.statusText, { color: meta.color }]}
                        >
                          {meta.label}
                        </ThemedText>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#C4C9CE"
                      />
                    </View>
                  </View>

                  <View style={styles.progressRow}>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${barPercent}%` as `${number}%`,
                            backgroundColor: meta.color,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      style={[styles.progressPercent, { color: meta.color }]}
                    >
                      {Math.round(rawPercent)}%
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Modal visible={modalVisible} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalCard, { backgroundColor: "#fff" }]}>
              <ThemedText
                style={[styles.modalTitle, { color: colors.backgroundElement }]}
              >
                New Pool
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.backgroundElement,
                    color: colors.backgroundElement,
                  },
                ]}
                placeholder="Pool name"
                placeholderTextColor={colors.textSecondary}
                value={poolName}
                onChangeText={setPoolName}
                maxLength={20}
              />
              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.input,
                    styles.limitInput,
                    {
                      borderColor: colors.backgroundElement,
                      color: colors.backgroundElement,
                    },
                  ]}
                  placeholder="Budget limit"
                  placeholderTextColor={colors.textSecondary}
                  value={poolLimit}
                  onChangeText={setPoolLimit}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    { borderColor: colors.backgroundElement },
                  ]}
                  onPress={() => setCurrencyPickerVisible(true)}
                >
                  <ThemedText
                    style={{
                      color: colors.backgroundElement,
                      fontWeight: "600",
                    }}
                  >
                    {poolCurrency}
                  </ThemedText>
                  <ThemedText style={{ color: colors.backgroundElement }}>
                    ▾
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "#e0e0e0" }]}
                  onPress={() => setModalVisible(false)}
                >
                  <ThemedText
                    style={{ color: "#333", fontWeight: "600", fontSize: 14 }}
                  >
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.btn,
                    { backgroundColor: colors.backgroundElement },
                  ]}
                  onPress={handleCreatePool}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.btnText}>Create</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <SelectModal
              visible={currencyPickerVisible}
              title="Currency"
              options={CURRENCY_OPTIONS}
              selectedValue={poolCurrency}
              colors={colors}
              onSelect={setPoolCurrency}
              onClose={() => setCurrencyPickerVisible(false)}
              sortSelectedFirst
            />
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  addPoolBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN + "40",
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.three,
  },
  scrollContent: { gap: Spacing.two, paddingBottom: Spacing.four },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: PRIMARY_GREEN,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "700",
  },
  poolName: { fontSize: 16, fontWeight: "800", color: TEXT_DARK },
  poolAmounts: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  statusCol: {
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  progressBg: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#E7E7E7",
  },
  progressFill: { height: 7, borderRadius: 4 },
  progressPercent: {
    fontSize: 12.5,
    fontWeight: "700",
    width: 42,
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: Spacing.two },
  limitInput: { flex: 1 },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    justifyContent: "center",
  },
  btn: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
