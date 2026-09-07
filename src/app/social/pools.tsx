import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SelectModal } from "@/components/ui/select-modal";
import { CURRENCIES } from "@/constants/currencies";
import { Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/data/use-current-user";
import { useProfile } from "@/hooks/data/use-profile";
import { createPool, usePools } from "@/hooks/data/use-pools";
import { useTheme } from "@/hooks/use-theme";
import { formatCurrency } from "@/lib/format";
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
      Alert.alert("Error", "Failed to create pool: " + (error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={{ width: 70 }} onPress={() => router.back()}>
            <ThemedText
              style={{
                color: colors.backgroundElement,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              ← Back
            </ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={{ color: colors.backgroundElement }}>
            Pools
          </ThemedText>
          <TouchableOpacity
            style={{ width: 70, alignItems: "flex-end" }}
            onPress={() => setModalVisible(true)}
          >
            <ThemedText
              style={{ color: colors.backgroundElement, fontSize: 24 }}
            >
              +
            </ThemedText>
          </TouchableOpacity>
        </View>

        {pools.length > 0 && (
          <TextInput
            style={[
              styles.searchInput,
              {
                borderColor: colors.backgroundElement,
                color: colors.backgroundElement,
              },
            ]}
            placeholder="Search pools..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
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
            {filteredPools.map((pool) => {
              const progress = Math.min(pool.total_spent / pool.pool_limit, 1);
              return (
                <TouchableOpacity
                  key={pool.id}
                  style={[
                    styles.card,
                    { backgroundColor: colors.backgroundElement + "15" },
                  ]}
                  onPress={() => router.push(`/social/pool/${pool.id}`)}
                >
                  <ThemedText
                    style={[
                      styles.poolName,
                      { color: colors.backgroundElement },
                    ]}
                  >
                    {pool.name}
                  </ThemedText>
                  <ThemedText
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginBottom: Spacing.two,
                    }}
                  >
                    {formatCurrency(pool.total_spent, pool.currency)} /{" "}
                    {formatCurrency(pool.pool_limit, pool.currency)}
                  </ThemedText>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress * 100}%` as `${number}%`,
                          backgroundColor:
                            progress > 0.85 ? "#e55" : colors.backgroundElement,
                        },
                      ]}
                    />
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
                  style={[styles.currencyButton, { borderColor: colors.backgroundElement }]}
                  onPress={() => setCurrencyPickerVisible(true)}
                >
                  <ThemedText style={{ color: colors.backgroundElement, fontWeight: "600" }}>
                    {poolCurrency}
                  </ThemedText>
                  <ThemedText style={{ color: colors.backgroundElement }}>▾</ThemedText>
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
  scrollContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    fontSize: 15,
    marginBottom: Spacing.three,
  },
  card: { borderRadius: 16, padding: Spacing.three },
  poolName: { fontSize: 18, fontWeight: "700", marginBottom: Spacing.one },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: "#e0e0e0" },
  progressFill: { height: 8, borderRadius: 4 },
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
